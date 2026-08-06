import {
  idsJugadoresActivos,
  actualizarMenBonus,
} from "@/repositories/jugador.repository";
import {
  asistenciasRecientesGlobal,
  estadisticasRecientesGlobal,
} from "@/repositories/evento.repository";
import {
  agregarInsumosPorJugador,
  calcularMenBonus,
  calcularRendimientoBonus,
  inicioVentanaCurva,
} from "@/lib/curva";

/**
 * Recalcula el bonus de MEN de TODOS los jugadores activos a partir de su
 * asistencia Y rendimiento en cancha (goles, asistencias, rojas) recientes
 * (ventana móvil), cada fuente con su propio tope. Lo corre el cron diario.
 * Idempotente: el bonus se recalcula desde cero, así que correrlo varias
 * veces no desvía.
 */
export async function recalcularMenDiario(): Promise<{ actualizados: number }> {
  const ahora = new Date();
  const desde = inicioVentanaCurva(ahora);

  const [activos, asistencias, estadisticas] = await Promise.all([
    idsJugadoresActivos(),
    asistenciasRecientesGlobal(desde),
    estadisticasRecientesGlobal(desde),
  ]);

  // Agregación en memoria por jugador (una sola lectura de cada fuente).
  const insumos = agregarInsumosPorJugador(asistencias, estadisticas);

  let actualizados = 0;
  for (const j of activos) {
    const entrada = insumos.get(j.id);
    const bonusAsistencia = calcularMenBonus(
      entrada?.asistencia ?? { entrenos: 0, partidos: 0, ausencias: 0 },
    );
    const bonusRendimiento = calcularRendimientoBonus(
      entrada?.rendimiento ?? { goles: 0, asistenciasGol: 0, rojas: 0 },
    );
    await actualizarMenBonus(j.id, bonusAsistencia + bonusRendimiento, ahora);
    actualizados++;
  }
  return { actualizados };
}
