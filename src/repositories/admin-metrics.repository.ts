import { db } from "@/lib/db";

// Métricas agregadas de la plataforma para el SUPER_ADMIN (Capa 4, solo lectura).
// Todas las consultas son CROSS-TENANT a propósito: miden el estado global de la
// plataforma, no el de una escuela. No pasan por assertTenant ni filtran por
// escuelaId; las que tocan modelos con escuelaId se marcan // tenant-global.

function desdeHaceDias(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/** Escuelas activas e inactivas. */
export async function contarEscuelas(): Promise<{
  activas: number;
  inactivas: number;
}> {
  const [activas, inactivas] = await Promise.all([
    db.escuela.count({ where: { activa: true } }),
    db.escuela.count({ where: { activa: false } }),
  ]);
  return { activas, inactivas };
}

/** Altas de escuelas en los últimos N días. */
export function contarAltasEscuelas(dias = 30): Promise<number> {
  return db.escuela.count({ where: { createdAt: { gte: desdeHaceDias(dias) } } });
}

/** Leads agrupados por estado del pipeline. */
export function leadsPorEstado() {
  return db.lead.groupBy({ by: ["estado"], _count: { _all: true } });
}

/** Jugadores totales y activos en toda la plataforma. */
export async function contarJugadores(): Promise<{
  total: number;
  activos: number;
}> {
  const [total, activos] = await Promise.all([
    // tenant-global: métrica agregada de plataforma (dashboard SUPER_ADMIN)
    db.jugador.count(),
    // tenant-global: métrica agregada de plataforma (dashboard SUPER_ADMIN)
    db.jugador.count({ where: { estado: "ACTIVO" } }),
  ]);
  return { total, activos };
}

/** Evaluaciones no anuladas de los últimos N días. */
export function contarEvaluaciones(dias = 30): Promise<number> {
  // tenant-global: métrica agregada de plataforma (dashboard SUPER_ADMIN)
  return db.evaluacion.count({
    where: { anulada: false, fecha: { gte: desdeHaceDias(dias) } },
  });
}

/** Eventos próximos (no cancelados) dentro de la ventana de N días. */
export function contarEventosProximos(dias = 7): Promise<number> {
  const ahora = new Date();
  const hasta = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  // tenant-global: métrica agregada de plataforma (dashboard SUPER_ADMIN)
  return db.evento.count({
    where: { cancelado: false, inicio: { gte: ahora, lte: hasta } },
  });
}

/**
 * Morosidad del período: membresías impagas (PENDIENTE/VENCIDA) y cuántas
 * escuelas distintas están afectadas.
 */
export async function contarMorosidad(
  periodo: string,
): Promise<{ jugadores: number; escuelas: number }> {
  // tenant-global: métrica agregada de plataforma (dashboard SUPER_ADMIN)
  const impagas = await db.membresia.findMany({
    where: { periodo, estado: { in: ["PENDIENTE", "VENCIDA"] } },
    select: { escuelaId: true },
  });
  return {
    jugadores: impagas.length,
    escuelas: new Set(impagas.map((m) => m.escuelaId)).size,
  };
}

/**
 * Acciones de soporte registradas en los últimos N días. Cuenta cualquier acción
 * del AuditLog relacionada con el modo soporte (INICIAR_SOPORTE, FINALIZAR_SOPORTE,
 * SOPORTE_HABILITA_ESCRITURA), que el modo soporte (M2) empezará a generar.
 */
export function contarAccionesSoporte(dias = 7): Promise<number> {
  return db.auditLog.count({
    where: {
      accion: { contains: "SOPORTE" },
      createdAt: { gte: desdeHaceDias(dias) },
    },
  });
}
