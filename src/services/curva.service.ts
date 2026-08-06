import {
  idsJugadoresActivos,
  actualizarMenBonus,
} from "@/repositories/jugador.repository";
import {
  asistenciasRecientesGlobal,
  estadisticasRecientesGlobal,
} from "@/repositories/evento.repository";
import {
  CURVA,
  calcularMenBonus,
  calcularRendimientoBonus,
  type InsumosCurva,
  type InsumosRendimiento,
} from "@/lib/curva";

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Recalcula el bonus de MEN de TODOS los jugadores activos a partir de su
 * asistencia Y rendimiento en cancha (goles, asistencias, rojas) recientes
 * (ventana móvil), cada fuente con su propio tope. Lo corre el cron diario.
 * Idempotente: el bonus se recalcula desde cero, así que correrlo varias
 * veces no desvía.
 */
export async function recalcularMenDiario(): Promise<{ actualizados: number }> {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() - CURVA.VENTANA_DIAS * DIA_MS);

  const [activos, asistencias, estadisticas] = await Promise.all([
    idsJugadoresActivos(),
    asistenciasRecientesGlobal(desde),
    estadisticasRecientesGlobal(desde),
  ]);

  // Agregación en memoria por jugador (una sola lectura de cada fuente).
  const insumosAsistencia = new Map<string, InsumosCurva>();
  for (const a of asistencias) {
    const cur = insumosAsistencia.get(a.jugadorId) ?? { entrenos: 0, partidos: 0, ausencias: 0 };
    if (!a.presente) cur.ausencias++;
    else if (a.evento.tipo === "PARTIDO") cur.partidos++;
    else if (a.evento.tipo === "ENTRENAMIENTO") cur.entrenos++;
    insumosAsistencia.set(a.jugadorId, cur);
  }

  const insumosRendimiento = new Map<string, InsumosRendimiento>();
  for (const e of estadisticas) {
    const cur = insumosRendimiento.get(e.jugadorId) ?? { goles: 0, asistenciasGol: 0, rojas: 0 };
    cur.goles += e.goles;
    cur.asistenciasGol += e.asistencias;
    if (e.roja) cur.rojas++;
    insumosRendimiento.set(e.jugadorId, cur);
  }

  let actualizados = 0;
  for (const j of activos) {
    const bonusAsistencia = calcularMenBonus(
      insumosAsistencia.get(j.id) ?? { entrenos: 0, partidos: 0, ausencias: 0 },
    );
    const bonusRendimiento = calcularRendimientoBonus(
      insumosRendimiento.get(j.id) ?? { goles: 0, asistenciasGol: 0, rojas: 0 },
    );
    await actualizarMenBonus(j.id, bonusAsistencia + bonusRendimiento, ahora);
    actualizados++;
  }
  return { actualizados };
}
