import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { parseCsv, aCsv } from "@/lib/csv";
import { jugadorSchema } from "@/lib/validators/jugador";
import {
  crearJugador,
  jugadoresParaDuplicados,
} from "@/repositories/jugador.repository";
import { listarCategorias } from "@/repositories/categoria.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { format } from "date-fns";

/** Cabeceras de la plantilla (orden de columnas). */
const CABECERAS = [
  "nombre",
  "apellido",
  "fechaNacimiento",
  "posicion",
  "dorsal",
  "categoria",
] as const;

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
    return escuelaId;
  }
  return requireEscuela(ctx);
}

function clave(nombre: string, apellido: string, fecha: Date): string {
  return `${nombre.trim().toLowerCase()}|${apellido.trim().toLowerCase()}|${format(fecha, "yyyy-MM-dd")}`;
}

/** Genera la plantilla CSV de una escuela (con sus categorías válidas). */
export async function generarPlantillaJugadores(
  ctx: AuthContext,
  escuelaId?: string,
): Promise<{ filename: string; contenido: string }> {
  const id = escuelaObjetivo(ctx, escuelaId);
  const escuela = await obtenerEscuela(id);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");
  const categorias = await listarCategorias(id);

  const filas: string[][] = [
    [...CABECERAS],
    ["Lucas", "García", "2014-03-15", "DEL", "9", categorias[0]?.nombre ?? ""],
    [
      `# Posiciones válidas: POR, DEF, MED, DEL. Fecha en formato AAAA-MM-DD. Dorsal opcional.`,
    ],
    [
      `# Categorías de ${escuela.nombre}: ${categorias.map((c) => c.nombre).join(", ") || "(sin categorías)"}`,
    ],
  ];

  return {
    filename: `plantilla-jugadores-${escuela.slug}.csv`,
    contenido: aCsv(filas),
  };
}

/**
 * Importa jugadores desde un CSV. ESCUELA_ADMIN (su tenant) o SUPER_ADMIN.
 * Valida cada fila, mapea la categoría por nombre, omite duplicados y crea los
 * válidos en estado ACTIVO. Acción sensible → auditada con los conteos.
 */
export async function importarJugadores(
  ctx: AuthContext,
  texto: string,
  escuelaId?: string,
): Promise<ResultadoImportacion> {
  const id = escuelaObjetivo(ctx, escuelaId);
  const escuela = await obtenerEscuela(id);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  const filas = parseCsv(texto);
  if (filas.length === 0) throw new ValidationError("El archivo está vacío.");

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
  let procesadas = 0;

  for (let i = 0; i < filas.length; i += 1) {
    const cols = filas[i];
    const c0 = (cols[0] ?? "").trim().toLowerCase();
    // Salta cabecera y comentarios.
    if (i === 0 && c0 === "nombre") continue;
    if (c0.startsWith("#")) continue;

    procesadas += 1;
    const numeroFila = i + 1; // 1-based para el usuario
    if (procesadas > MAX_FILAS) {
      throw new ValidationError(`El archivo supera el máximo de ${MAX_FILAS} jugadores.`);
    }

    const [nombre, apellido, fechaNacimiento, posicion, dorsal, categoria] = cols.map(
      (v) => (v ?? "").trim(),
    );

    const parsed = jugadorSchema.safeParse({
      nombre,
      apellido,
      fechaNacimiento,
      posicion: posicion?.toUpperCase(),
      categoriaId: "x", // se valida aparte (mapeo por nombre)
      dorsal: dorsal ? dorsal : undefined,
    });
    if (!parsed.success) {
      errores.push({ fila: numeroFila, mensaje: parsed.error.issues[0]?.message ?? "Fila inválida." });
      continue;
    }

    const categoriaId = porNombre.get((categoria ?? "").toLowerCase());
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
    motivo: `creados=${creados} omitidos=${omitidos} errores=${errores.length}`,
  });

  return { creados, omitidos, errores };
}
