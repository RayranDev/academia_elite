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
  CURVA,
  type Curva,
} from "@/lib/curva";
import { resolverCurvaEscuela } from "@/services/parametro-escuela.service";

/**
 * Recalcula el bonus de MEN de TODOS los jugadores activos a partir de su
 * asistencia Y rendimiento en cancha (goles, asistencias, rojas) recientes
 * (ventana móvil), cada fuente con su propio tope. Lo corre el cron diario.
 * Idempotente: el bonus se recalcula desde cero, así que correrlo varias
 * veces no desvía. Resuelve la curva UNA VEZ por escuela (pesos de la curva
 * overrideables) para no repetir la lectura de parámetros por jugador.
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

  // Agrupamos los jugadores activos por escuela para resolver la curva
  // (global + override) una sola vez por escuela, no por jugador.
  const escuelaIds = [...new Set(activos.map((j) => j.escuelaId))];
  const curvasPorEscuela = new Map(
    await Promise.all(
      escuelaIds.map(
        async (escuelaId): Promise<[string, Curva]> => [
          escuelaId,
          await resolverCurvaEscuela(escuelaId),
        ],
      ),
    ),
  );

  let actualizados = 0;
  for (const j of activos) {
    const curvaEscuela = curvasPorEscuela.get(j.escuelaId) ?? CURVA;
    const entrada = insumos.get(j.id);
    const bonusAsistencia = calcularMenBonus(
      entrada?.asistencia ?? { entrenos: 0, partidos: 0, ausencias: 0 },
      curvaEscuela,
    );
    const bonusRendimiento = calcularRendimientoBonus(
      entrada?.rendimiento ?? { goles: 0, asistenciasGol: 0, rojas: 0 },
      curvaEscuela,
    );
    await actualizarMenBonus(j.id, bonusAsistencia + bonusRendimiento, ahora);
    actualizados++;
  }
  return { actualizados };
}
