import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  listarMembresias,
  obtenerMembresia,
  upsertMembresia,
  cambiarEstadoMembresia,
  contarMembresiasPorEstado,
  contarFamiliasBloqueadas,
} from "@/repositories/membresia.repository";
import {
  obtenerJugador,
  obtenerJugadoresMinimos,
} from "@/repositories/jugador.repository";
import { registrarAuditoria } from "@/services/audit.service";
import type { MembresiaInput } from "@/lib/validators/membresia";

export interface MembresiaDTO {
  id: string;
  jugadorId: string;
  jugadorNombre: string;
  categoriaNombre: string;
  periodo: string;
  monto: number | null;
  estado: string;
}

/** Contadores de cobranza para el dashboard de la escuela. */
export interface ResumenMembresiasDTO {
  alDia: number;
  pendientes: number;
  vencidas: number;
  bloqueados: number;
}

/**
 * Resumen de administración (PLAN-UX-DT PR-2 · C2.3). El dashboard de la escuela
 * era 100% deportivo: el dueño no veía la cobranza, que es lo que le paga las
 * cuentas. Un solo groupBy + un count.
 */
export async function resumenMembresias(
  ctx: AuthContext,
): Promise<ResumenMembresiasDTO> {
  // Solo la escuela: el SUPER_ADMIN no tiene acceso ambiental al tenant (§5) y
  // los servicios hermanos de este archivo usan el mismo alcance.
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const [porEstado, bloqueados] = await Promise.all([
    contarMembresiasPorEstado(escuelaId),
    contarFamiliasBloqueadas(escuelaId),
  ]);

  const de = (estado: string) =>
    porEstado.find((p) => p.estado === estado)?._count._all ?? 0;

  return {
    alDia: de("PAGADA"),
    pendientes: de("PENDIENTE"),
    vencidas: de("VENCIDA"),
    bloqueados,
  };
}

/** Lista las cuotas de la escuela (opcional: filtrar por período AAAA-MM). */
export async function listarMembresiasEscuela(
  ctx: AuthContext,
  periodo?: string,
): Promise<MembresiaDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarMembresias(escuelaId, periodo);
  if (rows.length === 0) return [];

  const jugadores = await obtenerJugadoresMinimos(
    escuelaId,
    [...new Set(rows.map((r) => r.jugadorId))],
  );
  const porId = new Map(jugadores.map((j) => [j.id, j]));

  return rows.map((m) => {
    const j = porId.get(m.jugadorId);
    return {
      id: m.id,
      jugadorId: m.jugadorId,
      jugadorNombre: j ? `${j.apellido}, ${j.nombre}` : "—",
      categoriaNombre: j?.categoria.nombre ?? "—",
      periodo: m.periodo,
      monto: m.monto,
      estado: m.estado,
    };
  });
}

/** Crea o actualiza la cuota de un jugador para un período. Auditado. */
export async function registrarMembresiaEscuela(
  ctx: AuthContext,
  input: MembresiaInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  // El jugador debe pertenecer al tenant.
  const jugador = await obtenerJugador(escuelaId, input.jugadorId);
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, jugador.escuelaId);

  await upsertMembresia(escuelaId, input.jugadorId, input.periodo, {
    monto: input.monto,
    estado: input.estado,
  });
  await registrarAuditoria(ctx, {
    accion: "MEMBRESIA_REGISTRAR",
    entidad: "Membresia",
    entidadId: input.jugadorId,
    escuelaId,
    motivo: `${input.periodo} → ${input.estado}`,
  });
}

/** Cambia el estado de una cuota (PENDIENTE/PAGADA/VENCIDA). Auditado. */
export async function cambiarEstadoMembresiaEscuela(
  ctx: AuthContext,
  membresiaId: string,
  estado: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const m = await obtenerMembresia(escuelaId, membresiaId);
  if (!m) throw new NotFoundError("Cuota no encontrada.");

  await cambiarEstadoMembresia(escuelaId, membresiaId, estado);
  await registrarAuditoria(ctx, {
    accion: "MEMBRESIA_ESTADO",
    entidad: "Membresia",
    entidadId: membresiaId,
    escuelaId,
    motivo: `${m.periodo} → ${estado}`,
  });
}
