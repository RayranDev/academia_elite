import type { AuthContext } from "@/lib/auth/context";
import { ValidationError, DomainError } from "@/lib/errors";
import { parseXlsx, plantillaXlsx } from "@/lib/xlsx";
import { categoriasDelDt } from "@/services/dt-scope";
import { crearEvaluacion } from "@/services/evaluacion.service";
import { registrarAuditoria } from "@/services/audit.service";
import { evaluacionSchema } from "@/lib/validators/evaluacion";
import { jugadorSchema } from "@/lib/validators/jugador";
import {
  crearJugador,
  obtenerJugadorPorCodigo,
  listarPlantilla,
} from "@/repositories/jugador.repository";
import { listarCategorias } from "@/repositories/categoria.repository";

/**
 * Jornada de medición: carga masiva de evaluaciones por el DT. Una fila por
 * jugador. Sirve para EVALUAR existentes (con su código) y para EVALUAR jugadores
 * NUEVOS (creándolos en el acto). Reutiliza `crearEvaluacion` (mismo motor,
 * params de escuela, bonus y transacción) — la carta "nace" igual que en el alta
 * manual.
 */

// Cabeceras EXACTAS de la fila 1.
const CABECERAS = [
  "codigoJugador",
  "nombre",
  "apellido",
  "fechaNacimiento",
  "posicion",
  "categoria",
  "sprint30m",
  "saltoCm",
  "agilidadSeg",
  "yoyoNivel",
  "control",
  "pase",
  "tiro",
  "regate",
  "actitud",
  "concentracion",
  "trabajoEquipo",
  "resiliencia",
] as const;

// Medidas en los índices 6..17; para jugador nuevo además 1..5 (datos del alta).
const MAX_FILAS = 300;

const medidasSchema = evaluacionSchema.omit({
  jugadorId: true,
  observacionesPrivadas: true,
});

export interface ResultadoImportEval {
  evaluados: number;
  creadosNuevos: number;
  errores: { fila: number; mensaje: string }[];
}

function validarCabeceras(fila: string[] | undefined): void {
  const actuales = (fila ?? []).map((c) => c.trim().toLowerCase());
  const esperadas = CABECERAS.map((c) => c.toLowerCase());
  const ok =
    actuales.length >= esperadas.length &&
    esperadas.every((h, i) => actuales[i] === h);
  if (!ok) {
    throw new ValidationError(
      `La fila 1 debe tener exactamente estas cabeceras: ${CABECERAS.join(", ")}. Descarga la plantilla.`,
    );
  }
}

/** Genera la plantilla .xlsx de la jornada con los jugadores y categorías del DT. */
export async function generarPlantillaEvaluaciones(
  ctx: AuthContext,
): Promise<{ filename: string; buffer: Buffer }> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const [categorias, jugadores] = await Promise.all([
    listarCategorias(escuelaId),
    listarPlantilla(escuelaId, categoriaIds),
  ]);
  const misCategorias = categorias.filter((c) => categoriaIds.includes(c.id));

  const instrucciones = [
    "Jornada de medición — una fila por jugador.",
    "EVALUAR EXISTENTE: rellena 'codigoJugador' (deja nombre/apellido/fecha/posicion/categoria vacíos).",
    "EVALUAR NUEVO: deja 'codigoJugador' vacío y rellena nombre, apellido, fechaNacimiento (AAAA-MM-DD), posicion (POR/DEF/MED/DEL) y categoria.",
    "Medidas físicas reales: sprint30m (s), saltoCm (cm), agilidadSeg (s), yoyoNivel.",
    "Técnica y mentalidad (1-10): control, pase, tiro, regate, actitud, concentracion, trabajoEquipo, resiliencia.",
    "",
    `Categorías válidas: ${misCategorias.map((c) => c.nombre).join(", ") || "(sin categorías)"}`,
    "",
    "Tus jugadores (código — nombre):",
    ...jugadores.map((j) => `   ${j.codigoJugador ?? "(sin código)"} — ${j.apellido} ${j.nombre}`),
  ];

  const ejemploExistente = jugadores[0]?.codigoJugador ?? "";
  const buffer = await plantillaXlsx({
    nombreHoja: "Jornada",
    cabeceras: [...CABECERAS],
    ejemplo: [
      ejemploExistente, "", "", "", "", "",
      "5.2", "34", "17.5", "12", "7", "6", "6", "7", "8", "7", "8", "7",
    ],
    instrucciones,
  });

  return { filename: "jornada-medicion.xlsx", buffer };
}

/** Importa las evaluaciones de la jornada (DT). */
export async function importarEvaluaciones(
  ctx: AuthContext,
  buffer: Buffer,
): Promise<ResultadoImportEval> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const categorias = await listarCategorias(escuelaId);
  const porNombre = new Map(
    categorias
      .filter((c) => categoriaIds.includes(c.id))
      .map((c) => [c.nombre.trim().toLowerCase(), c.id]),
  );

  const filas = await parseXlsx(buffer);
  if (filas.length === 0) throw new ValidationError("El archivo está vacío.");
  validarCabeceras(filas[0]);

  const errores: { fila: number; mensaje: string }[] = [];
  let evaluados = 0;
  let creadosNuevos = 0;
  let procesadas = 0;

  for (let i = 1; i < filas.length; i += 1) {
    const cols = filas[i].map((v) => (v ?? "").trim());
    if (cols.every((c) => c === "")) continue;

    procesadas += 1;
    const numeroFila = i + 1;
    if (procesadas > MAX_FILAS) {
      throw new ValidationError(`El archivo supera el máximo de ${MAX_FILAS} filas.`);
    }

    try {
      // Medidas (siempre obligatorias).
      const m = medidasSchema.safeParse({
        sprint30mSeg: cols[6],
        saltoVerticalCm: cols[7],
        agilidadIllinoisSeg: cols[8],
        resistenciaYoyoNivel: cols[9],
        controlBalon: cols[10],
        pase: cols[11],
        tiro: cols[12],
        regate: cols[13],
        actitud: cols[14],
        concentracion: cols[15],
        trabajoEquipo: cols[16],
        resiliencia: cols[17],
      });
      if (!m.success) {
        errores.push({ fila: numeroFila, mensaje: m.error.issues[0]?.message ?? "Medidas inválidas." });
        continue;
      }

      // Resolver jugador: existente (por código) o nuevo.
      let jugadorId: string;
      const codigo = cols[0];
      if (codigo) {
        const jugador = await obtenerJugadorPorCodigo(escuelaId, codigo.toUpperCase());
        if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
          errores.push({ fila: numeroFila, mensaje: `No tienes un jugador con código "${codigo}".` });
          continue;
        }
        if (jugador.estado !== "ACTIVO") {
          errores.push({ fila: numeroFila, mensaje: `El jugador "${codigo}" no está activo.` });
          continue;
        }
        jugadorId = jugador.id;
      } else {
        const datos = jugadorSchema.safeParse({
          nombre: cols[1],
          apellido: cols[2],
          fechaNacimiento: cols[3],
          posicion: cols[4]?.toUpperCase(),
          categoriaId: "x",
          dorsal: undefined,
        });
        if (!datos.success) {
          errores.push({ fila: numeroFila, mensaje: datos.error.issues[0]?.message ?? "Datos del jugador nuevo inválidos." });
          continue;
        }
        const categoriaId = porNombre.get((cols[5] ?? "").toLowerCase());
        if (!categoriaId) {
          errores.push({ fila: numeroFila, mensaje: `Categoría desconocida o no es tuya: "${cols[5]}".` });
          continue;
        }
        const nuevo = await crearJugador(escuelaId, {
          categoriaId,
          nombre: datos.data.nombre,
          apellido: datos.data.apellido,
          fechaNacimiento: datos.data.fechaNacimiento,
          posicion: datos.data.posicion,
          dorsal: null,
          estado: "ACTIVO",
        });
        jugadorId = nuevo.id;
        creadosNuevos += 1;
      }

      // La carta nace con el mismo motor que el alta manual.
      await crearEvaluacion(ctx, { jugadorId, ...m.data });
      evaluados += 1;
    } catch (e) {
      const msg = e instanceof DomainError ? e.message : "Error al evaluar la fila.";
      errores.push({ fila: numeroFila, mensaje: msg });
    }
  }

  await registrarAuditoria(ctx, {
    accion: "IMPORTAR_EVALUACIONES",
    entidad: "Escuela",
    entidadId: escuelaId,
    escuelaId,
    motivo: `evaluados=${evaluados} nuevos=${creadosNuevos} errores=${errores.length}`,
  });

  return { evaluados, creadosNuevos, errores };
}
