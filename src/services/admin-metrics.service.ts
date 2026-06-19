import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import {
  contarEscuelas,
  contarAltasEscuelas,
  leadsPorEstado,
  contarJugadores,
  contarEvaluaciones,
  contarEventosProximos,
  contarMorosidad,
  contarAccionesSoporte,
} from "@/repositories/admin-metrics.repository";
import { listarAuditGlobal } from "@/repositories/audit.repository";
import { ESTADOS_LEAD } from "@/types";

// Servicio del dashboard de salud de la plataforma (Capa 3, solo SUPER_ADMIN).
// Solo lectura y solo agregados: no expone ninguna acción de escritura.

export interface AccionAuditadaDTO {
  id: string;
  actorRol: string;
  accion: string;
  entidad: string;
  escuelaId: string | null;
  motivo: string | null;
  createdAt: string;
}

export interface SaludPlataformaDTO {
  escuelas: { activas: number; inactivas: number };
  altasEscuelas30d: number;
  leadsPorEstado: Record<string, number>;
  jugadores: { total: number; activos: number };
  evaluaciones30d: number;
  eventosProximos7d: number;
  morosidad: { jugadores: number; escuelas: number };
  accionesSoporte7d: number;
  ultimasAcciones: AccionAuditadaDTO[];
}

/** Período de facturación actual en formato "YYYY-MM" (coincide con Membresia.periodo). */
function periodoActual(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Salud agregada de toda la plataforma para el SUPER_ADMIN. Son métricas
 * cross-tenant por diseño (NO pasan por assertTenant) y NO incluyen ninguna
 * acción de escritura sobre datos de un tenant. Para bajar al detalle de una
 * escuela, el camino es abrir una sesión de soporte (M2).
 */
export async function saludPlataforma(
  ctx: AuthContext,
): Promise<SaludPlataformaDTO> {
  requireRole(ctx, ["SUPER_ADMIN"]);

  const [escuelas, altas, leads, jugadores, evals, eventos, morosidad, soporte, audit] =
    await Promise.all([
      contarEscuelas(),
      contarAltasEscuelas(30),
      leadsPorEstado(),
      contarJugadores(),
      contarEvaluaciones(30),
      contarEventosProximos(7),
      contarMorosidad(periodoActual()),
      contarAccionesSoporte(7),
      listarAuditGlobal({ take: 20 }),
    ]);

  const leadsMap = Object.fromEntries(
    ESTADOS_LEAD.map((e) => [e, 0]),
  ) as Record<string, number>;
  for (const row of leads) leadsMap[row.estado] = row._count._all;

  return {
    escuelas,
    altasEscuelas30d: altas,
    leadsPorEstado: leadsMap,
    jugadores,
    evaluaciones30d: evals,
    eventosProximos7d: eventos,
    morosidad,
    accionesSoporte7d: soporte,
    ultimasAcciones: audit.map((a) => ({
      id: a.id,
      actorRol: a.actorRol,
      accion: a.accion,
      entidad: a.entidad,
      escuelaId: a.escuelaId,
      motivo: a.motivo,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
