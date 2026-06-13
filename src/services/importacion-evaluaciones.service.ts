import type { AuthContext } from "@/lib/auth/context";
import { ValidationError, DomainError } from "@/lib/errors";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { parseXlsx, plantillaXlsx } from "@/lib/xlsx";
import { categoriasDelDt } from "@/services/dt-scope";
import { evaluarJugadorCore } from "@/services/evaluacion.service";
import { registrarAuditoria } from "@/services/audit.service";
import { evaluacionSchema } from "@/lib/validators/evaluacion";
import { jugadorSchema } from "@/lib/validators/jugador";
import {
  crearJugador,
  obtenerJugador,
  obtenerJugadorPorCodigo,
  listarPlantilla,
} from "@/repositories/jugador.repository";
import { listarCategorias } from "@/repositories/categoria.repository";
import { entrenadorDeCategoria } from "@/repositories/entrenador.repository";

/**
 * Jornada de medición: carga masiva de evaluaciones. La hace el **DT** (sus
 * categorías) o el **Súper Admin / Escuela** (toda la escuela). Una fila por
 * jugador: evalúa EXISTENTES (por código) y crea+evalúa NUEVOS. Reutiliza el
 * núcleo de evaluación (mismo motor, params de escuela, bonus y transacción).
 * Para el SA/Escuela cada evaluación se imputa al DT de la categoría del jugador.
 */

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

interface Alcance {
  escuelaId: string;
  categoriaIds: string[]; // categorías sobre las que puede operar el actor
  entrenadorFijo: string | null; // DT → su entrenadorId; SA/Escuela → null
}

/** Resuelve el alcance del actor: DT (sus categorías) o SA/Escuela (toda). */
async function resolverAlcance(ctx: AuthContext, escuelaId?: string): Promise<Alcance> {
  if (ctx.rol === "DT") {
    const scope = await categoriasDelDt(ctx);
    return {
      escuelaId: scope.escuelaId,
      categoriaIds: scope.categoriaIds,
      entrenadorFijo: scope.entrenadorId,
    };
  }
  requireRole(ctx, ["ESCUELA_ADMIN", "SUPER_ADMIN"]);
  const id =
    ctx.rol === "SUPER_ADMIN"
      ? (() => {
          if (!escuelaId) throw new ValidationError("Falta la escuela.");
          return escuelaId;
        })()
      : requireEscuela(ctx);
  const cats = await listarCategorias(id);
  return { escuelaId: id, categoriaIds: cats.map((c) => c.id), entrenadorFijo: null };
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

/** Plantilla .xlsx con TODOS los jugadores ACTIVOS y categorías del alcance. */
export async function generarPlantillaEvaluaciones(
  ctx: AuthContext,
  escuelaId?: string,
): Promise<{ filename: string; buffer: Buffer }> {
  const { escuelaId: id, categoriaIds } = await resolverAlcance(ctx, escuelaId);
  const [categorias, jugadores] = await Promise.all([
    listarCategorias(id),
    listarPlantilla(id, categoriaIds),
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
    "Jugadores inscritos (código — nombre — categoría):",
    ...jugadores.map(
      (j) => `   ${j.codigoJugador ?? "(sin código)"} — ${j.apellido} ${j.nombre} — ${j.categoria.nombre}`,
    ),
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

/** Importa las evaluaciones de la jornada (DT o SA/Escuela). */
export async function importarEvaluaciones(
  ctx: AuthContext,
  buffer: Buffer,
  escuelaId?: string,
): Promise<ResultadoImportEval> {
  const { escuelaId: id, categoriaIds, entrenadorFijo } = await resolverAlcance(ctx, escuelaId);
  const categorias = await listarCategorias(id);
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

  // Caché de entrenador por categoría (para el SA/Escuela).
  const entrenadorPorCategoria = new Map<string, string | null>();
  async function resolverEntrenador(categoriaId: string): Promise<string | null> {
    if (entrenadorFijo) return entrenadorFijo;
    if (!entrenadorPorCategoria.has(categoriaId)) {
      entrenadorPorCategoria.set(categoriaId, await entrenadorDeCategoria(categoriaId));
    }
    return entrenadorPorCategoria.get(categoriaId) ?? null;
  }

  for (let i = 1; i < filas.length; i += 1) {
    const cols = filas[i].map((v) => (v ?? "").trim());
    if (cols.every((c) => c === "")) continue;

    procesadas += 1;
    const numeroFila = i + 1;
    if (procesadas > MAX_FILAS) {
      throw new ValidationError(`El archivo supera el máximo de ${MAX_FILAS} filas.`);
    }

    try {
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

      // Resolver jugador (existente por código o nuevo) y su categoría.
      let jugadorId: string;
      let categoriaId: string;
      const codigo = cols[0];
      if (codigo) {
        const jugador = await obtenerJugadorPorCodigo(id, codigo.toUpperCase());
        if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
          errores.push({ fila: numeroFila, mensaje: `No hay un jugador con código "${codigo}" en este alcance.` });
          continue;
        }
        if (jugador.estado !== "ACTIVO") {
          errores.push({ fila: numeroFila, mensaje: `El jugador "${codigo}" no está activo.` });
          continue;
        }
        jugadorId = jugador.id;
        categoriaId = jugador.categoriaId;
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
        const catId = porNombre.get((cols[5] ?? "").toLowerCase());
        if (!catId) {
          errores.push({ fila: numeroFila, mensaje: `Categoría desconocida o fuera de alcance: "${cols[5]}".` });
          continue;
        }
        const nuevo = await crearJugador(id, {
          categoriaId: catId,
          nombre: datos.data.nombre,
          apellido: datos.data.apellido,
          fechaNacimiento: datos.data.fechaNacimiento,
          posicion: datos.data.posicion,
          dorsal: null,
          estado: "ACTIVO",
        });
        jugadorId = nuevo.id;
        categoriaId = catId;
        creadosNuevos += 1;
      }

      const entrenadorId = await resolverEntrenador(categoriaId);
      if (!entrenadorId) {
        errores.push({ fila: numeroFila, mensaje: "Esa categoría no tiene un DT asignado; asigna uno y reintenta." });
        continue;
      }

      const jugadorFull = await obtenerJugador(id, jugadorId);
      if (!jugadorFull) {
        errores.push({ fila: numeroFila, mensaje: "No se pudo cargar el jugador." });
        continue;
      }
      await evaluarJugadorCore(id, entrenadorId, jugadorFull, { jugadorId, ...m.data });
      evaluados += 1;
    } catch (e) {
      const msg = e instanceof DomainError ? e.message : "Error al evaluar la fila.";
      errores.push({ fila: numeroFila, mensaje: msg });
    }
  }

  await registrarAuditoria(ctx, {
    accion: "IMPORTAR_EVALUACIONES",
    entidad: "Escuela",
    entidadId: id,
    escuelaId: id,
    motivo: `evaluados=${evaluados} nuevos=${creadosNuevos} errores=${errores.length}`,
  });

  return { evaluados, creadosNuevos, errores };
}
