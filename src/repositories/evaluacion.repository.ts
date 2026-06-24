import { db } from "@/lib/db";

// Repositorio de evaluaciones (Capa 4). Las evaluaciones son INMUTABLES.

/** Evaluaciones (no anuladas) de un jugador, con su snapshot de stats. */
export function listarEvaluacionesJugador(escuelaId: string, jugadorId: string) {
  return db.evaluacion.findMany({
    where: { escuelaId, jugadorId, anulada: false },
    include: { statsCalculados: true },
    orderBy: { fecha: "asc" },
  });
}

/** Logros BONUS aún no consumidos de un jugador (para aplicarlos en la próxima eval). */
export function bonusPendientes(jugadorId: string) {
  // tenant-global: filtrado por jugadorId; tenant verificado aguas arriba en el service
  return db.logroJugador.findMany({
    where: { jugadorId, bonusConsumido: false, logro: { tipo: "BONUS" } },
    include: {
      logro: {
        select: {
          statBonus: true,
          valorBonus: true,
          activo: true,
          escuelaId: true,
        },
      },
    },
    orderBy: { otorgadoEn: "asc" },
  });
}

export function obtenerEvaluacion(escuelaId: string, id: string) {
  return db.evaluacion.findFirst({ where: { id, escuelaId } });
}

export function marcarEvaluacionAnulada(escuelaId: string, id: string) {
  return db.evaluacion.updateMany({
    where: { id, escuelaId },
    data: { anulada: true },
  });
}
