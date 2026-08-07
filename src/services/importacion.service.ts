import type { AuthContext } from "@/lib/auth/context";
import {
  requireRole,
  requireEscuela,
  assertTenant,
  assertSoportePuedeEscribir,
  assertMotivoSoporte,
} from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { parseXlsx, plantillaJugadoresXlsx, sinVaciosAlFinal } from "@/lib/xlsx";
import { jugadorSchema } from "@/lib/validators/jugador";
import {
  crearJugador,
  jugadoresParaDuplicados,
} from "@/repositories/jugador.repository";
import { listarCategorias } from "@/repositories/categoria.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { format } from "date-fns";

/**
 * Cabeceras de la plantilla (orden y nombres EXACTOS de la fila 1).
 *
 * Las columnas OPCIONALES nuevas se agregan AL FINAL, nunca en el medio: acá se
 * valida por posición, se destructura la fila por índice y `OBLIGATORIAS` tiene
 * los índices escritos a mano — insertar en el medio corre todo y rompe los
 * archivos que las escuelas ya tienen llenos.
 */
const CABECERAS = [
  "nombre",
  "apellido",
  "fechaNacimiento",
  "posicion",
  "dorsal",
  "categoria",
  "genero",
] as const;

/** Cuántas cabeceras del final son opcionales (ver `validarCabeceras`). */
const CABECERAS_OPCIONALES_AL_FINAL = 1; // genero

/** Columnas obligatorias (todas menos dorsal). */
const OBLIGATORIAS: { idx: number; etiqueta: string }[] = [
  { idx: 0, etiqueta: "nombre" },
  { idx: 1, etiqueta: "apellido" },
  { idx: 2, etiqueta: "fechaNacimiento" },
  { idx: 3, etiqueta: "posicion" },
  { idx: 5, etiqueta: "categoria" },
];

const MAX_FILAS = 500;

export interface ResultadoImportacion {
  creados: number;
  omitidos: number;
  errores: { fila: number; mensaje: string }[];
}

/** Resuelve la escuela sobre la que opera el actor (tenant o SA explícito). */
function escuelaObjetivo(ctx: AuthContext, escuelaId?: string): string {
  requireRole(ctx, ["ESCUELA_ADMIN", "SUPER_ADMIN"]);
  if (ctx.rol === "SUPER_ADMIN") {
    if (!escuelaId) throw new ValidationError("Falta la escuela.");
    // PII de un tenant: el SA solo accede con sesión de soporte activa (M2).
    assertTenant(ctx, escuelaId);
    return escuelaId;
  }
  return requireEscuela(ctx);
}

function clave(nombre: string, apellido: string, fecha: Date): string {
  return `${nombre.trim().toLowerCase()}|${apellido.trim().toLowerCase()}|${format(fecha, "yyyy-MM-dd")}`;
}

/** Genera la plantilla .xlsx de una escuela (con sus categorías válidas). */
export async function generarPlantillaJugadores(
  ctx: AuthContext,
  escuelaId?: string,
): Promise<{ filename: string; buffer: Buffer }> {
  const id = escuelaObjetivo(ctx, escuelaId);
  const escuela = await obtenerEscuela(id);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");
  const categorias = await listarCategorias(id);

  const buffer = await plantillaJugadoresXlsx({
    cabeceras: [...CABECERAS],
    ejemplo: ["Lucas", "García", "2014-03-15", "DEL", "9", categorias[0]?.nombre ?? "", "M"],
    escuelaNombre: escuela.nombre,
    categorias: categorias.map((c) => c.nombre),
  });

  return { filename: `plantilla-jugadores-${escuela.slug}.xlsx`, buffer };
}

/**
 * Verifica que la fila 1 traiga las cabeceras requeridas, en orden.
 *
 * Se aceptan filas MÁS CORTAS mientras lo único que falte sean las columnas
 * opcionales del final: una plantilla descargada antes de que existiera
 * `genero` sigue siendo válida, y una escuela con el archivo a medio llenar no
 * tiene que rehacerlo cada vez que se agrega una columna opcional.
 */
function validarCabeceras(fila: string[] | undefined): void {
  const actuales = sinVaciosAlFinal(
    (fila ?? []).map((c) => c.trim().toLowerCase()),
  );
  const esperadas = CABECERAS.map((c) => c.toLowerCase());
  const minimas = esperadas.length - CABECERAS_OPCIONALES_AL_FINAL;
  const ok =
    actuales.length >= minimas &&
    esperadas.every((h, i) => i >= actuales.length || actuales[i] === h);
  if (!ok) {
    throw new ValidationError(
      `La fila 1 debe tener exactamente estas cabeceras: ${CABECERAS.join(", ")}. Descarga la plantilla.`,
    );
  }
}

/**
 * Importa jugadores desde un .xlsx. ESCUELA_ADMIN (su tenant) o SUPER_ADMIN.
 * Valida la fila de cabeceras, luego cada fila: si falta un dato obligatorio
 * registra el error (con nº de fila y campo) sin detener el resto; ignora filas
 * vacías; mapea la categoría por nombre; omite duplicados; crea los válidos en
 * estado ACTIVO. Acción sensible → auditada con los conteos.
 */
export async function importarJugadores(
  ctx: AuthContext,
  buffer: Buffer,
  escuelaId?: string,
  /** Por qué el SUPER_ADMIN entra a escribir en este tenant (M1). */
  motivo?: string,
): Promise<ResultadoImportacion> {
  const id = escuelaObjetivo(ctx, escuelaId);
  const escuela = await obtenerEscuela(id);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");
  // Esto ESCRIBE (crea jugadores). Una sesión de soporte nace en solo-lectura:
  // sin habilitarla, el SUPER_ADMIN no puede importar (AGENTS.md §5). Y toda
  // escritura suya sobre un tenant exige un motivo (M1): el AuditLog tiene que
  // poder responder POR QUÉ entró, no solo cuántas filas tocó.
  assertSoportePuedeEscribir(ctx);
  assertMotivoSoporte(ctx, motivo);

  const filas = await parseXlsx(buffer);
  if (filas.length === 0) throw new ValidationError("El archivo está vacío.");
  validarCabeceras(filas[0]);
  // El tope se valida ANTES del loop, no adentro: cortando a mitad de la carga el
  // throw salía sin pasar por `registrarAuditoria`, dejando creados hasta 500
  // jugadores sin una sola entrada de auditoría (mismo defecto ya corregido en
  // `importacion-evaluaciones.service.ts`).
  if (filas.length - 1 > MAX_FILAS) {
    throw new ValidationError(`El archivo supera el máximo de ${MAX_FILAS} jugadores.`);
  }

  // Mapa de categorías por nombre (normalizado) y set de duplicados existentes.
  const categorias = await listarCategorias(id);
  const porNombre = new Map(categorias.map((c) => [c.nombre.trim().toLowerCase(), c.id]));
  const existentes = await jugadoresParaDuplicados(id);
  const yaExiste = new Set(
    existentes.map((j) => clave(j.nombre, j.apellido, j.fechaNacimiento)),
  );

  const errores: { fila: number; mensaje: string }[] = [];
  let creados = 0;
  let omitidos = 0;

  // Empezamos en 1 para saltar la fila de cabeceras.
  for (let i = 1; i < filas.length; i += 1) {
    const cols = filas[i].map((v) => (v ?? "").trim());
    if (cols.every((c) => c === "")) continue; // fila vacía → se ignora

    const numeroFila = i + 1; // 1-based, contando la cabecera

    // Primero, campos obligatorios presentes (mensaje claro por campo).
    const faltan = OBLIGATORIAS.filter((o) => !cols[o.idx]).map((o) => o.etiqueta);
    if (faltan.length > 0) {
      errores.push({ fila: numeroFila, mensaje: `Falta(n): ${faltan.join(", ")}.` });
      continue;
    }

    // `genero` puede no existir (archivo de una plantilla anterior): la columna
    // es opcional y va al final, así que `undefined` es un caso normal.
    const [nombre, apellido, fechaNacimiento, posicion, dorsal, categoria, genero] = cols;
    const parsed = jugadorSchema.safeParse({
      nombre,
      apellido,
      fechaNacimiento,
      posicion: posicion.toUpperCase(),
      categoriaId: "x", // la categoría se valida por nombre aparte
      dorsal: dorsal ? dorsal : undefined,
      genero: genero ? genero.toUpperCase() : undefined,
    });
    if (!parsed.success) {
      errores.push({ fila: numeroFila, mensaje: parsed.error.issues[0]?.message ?? "Fila inválida." });
      continue;
    }

    const categoriaId = porNombre.get(categoria.toLowerCase());
    if (!categoriaId) {
      errores.push({ fila: numeroFila, mensaje: `Categoría desconocida: "${categoria}".` });
      continue;
    }

    const k = clave(parsed.data.nombre, parsed.data.apellido, parsed.data.fechaNacimiento);
    if (yaExiste.has(k)) {
      omitidos += 1;
      continue;
    }

    await crearJugador(id, {
      categoriaId,
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      fechaNacimiento: parsed.data.fechaNacimiento,
      posicion: parsed.data.posicion,
      dorsal: parsed.data.dorsal ?? null,
      genero: parsed.data.genero ?? null,
      estado: "ACTIVO",
    });
    yaExiste.add(k); // evita duplicados dentro del mismo archivo
    creados += 1;
  }

  await registrarAuditoria(ctx, {
    accion: "IMPORTAR_JUGADORES",
    entidad: "Escuela",
    entidadId: id,
    escuelaId: id,
    // El motivo del SA va primero: es el porqué. Los conteos son el qué, y solos
    // no responden la pregunta que se hace después de un incidente.
    motivo: [motivo?.trim(), `creados=${creados} omitidos=${omitidos} errores=${errores.length}`]
      .filter(Boolean)
      .join(" · "),
  });

  return { creados, omitidos, errores };
}
