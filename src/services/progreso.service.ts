import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { listarHijos, listarPlantilla } from "@/repositories/jugador.repository";
import {
  listarProgresosJugador,
  obtenerProgresoSemana,
  listarSemana,
  crearProgresoSemana,
} from "@/repositories/progreso.repository";
import { categoriasDelDt } from "@/services/dt-scope";
import { registrarAuditoria } from "@/services/audit.service";
import type { ProgresoSemanaInput, ProgresoDtInput } from "@/lib/validators/progreso";
import {
  HABITOS,
  inicioSemanaISO,
  xpDeSemana,
  xpTotal,
  nivelPersonal,
  calcularAtributos,
  type SemanaHabitos,
} from "@/lib/progreso/engine";

export interface SemanaProgresoDTO {
  semana: string; // lunes ISO "yyyy-MM-dd"
  habitos: SemanaHabitos;
  xp: number;
  nota: string | null;
  validadaPorDt: boolean; // validada por el DT (no por el responsable)
}

export interface ProgresoPersonalDTO {
  jugadorId: string;
  nombre: string;
  apellido: string;
  hijos: { id: string; nombre: string; apellido: string }[];
  semanaActual: string;
  semanaValidada: boolean;
  xp: number;
  nivel: number;
  xpEnNivel: number;
  xpParaSubir: number;
  mentalidad: number;
  disciplina: number;
  historial: SemanaProgresoDTO[];
}

type Hijo = Awaited<ReturnType<typeof listarHijos>>[number];

/** Carga el jugador y verifica que el usuario es su responsable. */
async function cargarHijoAutorizado(
  ctx: AuthContext,
  jugadorId?: string,
): Promise<Hijo> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) {
    throw new NotFoundError("No hay jugadores vinculados a tu cuenta.");
  }
  const elegido = jugadorId ? hijos.find((h) => h.id === jugadorId) : hijos[0];
  if (!elegido) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, elegido.escuelaId);
  return elegido;
}

function aHabitos(row: Record<string, unknown>): SemanaHabitos {
  return Object.fromEntries(
    HABITOS.map((h) => [h, Boolean(row[h])]),
  ) as SemanaHabitos;
}

/** Progreso personal del jugador (solo su responsable). */
export async function obtenerProgresoPersonal(
  ctx: AuthContext,
  jugadorId?: string,
): Promise<ProgresoPersonalDTO> {
  const hijo = await cargarHijoAutorizado(ctx, jugadorId);
  const hijos = await listarHijos(ctx.userId);
  const rows = await listarProgresosJugador(hijo.escuelaId, hijo.id);

  const semanas = rows.map(aHabitos);
  const xp = xpTotal(semanas);
  const nivel = nivelPersonal(xp);
  const atributos = calcularAtributos(semanas);
  const semanaActual = inicioSemanaISO(new Date());

  return {
    jugadorId: hijo.id,
    nombre: hijo.nombre,
    apellido: hijo.apellido,
    hijos: hijos.map((h) => ({
      id: h.id,
      nombre: h.nombre,
      apellido: h.apellido,
    })),
    semanaActual,
    semanaValidada: rows.some((r) => r.semana === semanaActual),
    xp,
    nivel: nivel.nivel,
    xpEnNivel: nivel.xpEnNivel,
    xpParaSubir: nivel.xpParaSubir,
    mentalidad: atributos.mentalidad,
    disciplina: atributos.disciplina,
    historial: rows.map((r) => ({
      semana: r.semana,
      habitos: aHabitos(r),
      xp: xpDeSemana(aHabitos(r)),
      nota: r.nota,
      validadaPorDt:
        r.validadoPorId !== hijo.padreUserId &&
        r.validadoPorId !== hijo.cuentaUserId,
    })),
  };
}

/**
 * Valida la semana en curso (una sola vez por semana ISO, solo el
 * responsable). Acción sensible → auditada.
 */
export async function validarSemanaActual(
  ctx: AuthContext,
  input: ProgresoSemanaInput,
): Promise<void> {
  const hijo = await cargarHijoAutorizado(ctx, input.jugadorId);
  const semana = inicioSemanaISO(new Date());

  const existente = await obtenerProgresoSemana(hijo.id, semana);
  if (existente) {
    throw new ValidationError("Esta semana ya fue validada.");
  }

  const creado = await crearProgresoSemana({
    escuelaId: hijo.escuelaId,
    jugadorId: hijo.id,
    semana,
    academico: input.academico,
    comportamiento: input.comportamiento,
    puntualidad: input.puntualidad,
    ayudaCasa: input.ayudaCasa,
    valores: input.valores,
    nota: input.nota ?? null,
    validadoPorId: ctx.userId,
  });

  await registrarAuditoria(ctx, {
    accion: "VALIDAR_PROGRESO_SEMANAL",
    entidad: "ProgresoSemanal",
    entidadId: creado.id,
    escuelaId: hijo.escuelaId,
  });
}

// --- Validación masiva por el DT ---

export interface JugadorProgresoDtDTO {
  jugadorId: string;
  nombre: string;
  apellido: string;
  categoriaId: string;
  categoriaNombre: string;
  semanaValidada: boolean;
}

export interface ProgresoPlantillaDtDTO {
  semana: string;
  jugadores: JugadorProgresoDtDTO[];
}

/**
 * Plantilla del DT con el estado de validación de la semana en curso.
 * Solo jugadores ACTIVOS de las categorías asignadas al DT.
 */
export async function obtenerProgresoPlantillaDt(
  ctx: AuthContext,
): Promise<ProgresoPlantillaDtDTO> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugadores = await listarPlantilla(escuelaId, categoriaIds);
  const semana = inicioSemanaISO(new Date());
  const validadas = new Set(
    (await listarSemana(escuelaId, semana, jugadores.map((j) => j.id))).map(
      (r) => r.jugadorId,
    ),
  );

  return {
    semana,
    jugadores: jugadores.map((j) => ({
      jugadorId: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      categoriaId: j.categoriaId,
      categoriaNombre: j.categoria.nombre,
      semanaValidada: validadas.has(j.id),
    })),
  };
}

/**
 * El DT valida la semana en curso para varios jugadores de sus categorías.
 * Salta los ya validados (sin error). Una validación por semana ISO la hace
 * quien llegue primero (padre o DT). Acción sensible → auditada por jugador.
 */
export async function validarSemanaDt(
  ctx: AuthContext,
  input: ProgresoDtInput,
): Promise<{ validados: number; omitidos: number }> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugadores = await listarPlantilla(escuelaId, categoriaIds);
  const propios = new Set(jugadores.map((j) => j.id));
  const semana = inicioSemanaISO(new Date());

  // Solo jugadores de las categorías del DT (los ajenos se descartan en silencio).
  const candidatos = input.entradas.filter((e) => propios.has(e.jugadorId));
  const yaValidados = new Set(
    (
      await listarSemana(escuelaId, semana, candidatos.map((e) => e.jugadorId))
    ).map((r) => r.jugadorId),
  );

  let validados = 0;
  for (const e of candidatos) {
    if (yaValidados.has(e.jugadorId)) continue;
    let creado;
    try {
      creado = await crearProgresoSemana({
        escuelaId,
        jugadorId: e.jugadorId,
        semana,
        academico: e.academico,
        comportamiento: e.comportamiento,
        puntualidad: e.puntualidad,
        ayudaCasa: e.ayudaCasa,
        valores: e.valores,
        nota: e.nota ?? null,
        validadoPorId: ctx.userId,
      });
    } catch {
      // Carrera con el responsable: la unicidad jugadorId+semana ganó el otro.
      continue;
    }
    validados += 1;
    await registrarAuditoria(ctx, {
      accion: "VALIDAR_PROGRESO_SEMANAL",
      entidad: "ProgresoSemanal",
      entidadId: creado.id,
      escuelaId,
    });
  }

  return { validados, omitidos: candidatos.length - validados };
}
