import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { listarHijos } from "@/repositories/jugador.repository";
import {
  listarProgresosJugador,
  obtenerProgresoSemana,
  crearProgresoSemana,
} from "@/repositories/progreso.repository";
import { registrarAuditoria } from "@/services/audit.service";
import {
  HABITOS,
  inicioSemanaISO,
  xpDeSemana,
  xpTotal,
  nivelPersonal,
  calcularAtributos,
  type SemanaHabitos,
} from "@/lib/progreso/engine";
import type { ProgresoSemanaInput } from "@/lib/validators/progreso";

export interface SemanaProgresoDTO {
  semana: string; // lunes ISO "yyyy-MM-dd"
  habitos: SemanaHabitos;
  xp: number;
  nota: string | null;
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
