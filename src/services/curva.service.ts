import {
  idsJugadoresActivos,
  actualizarMenBonus,
} from "@/repositories/jugador.repository";
import { asistenciasRecientesGlobal } from "@/repositories/evento.repository";
import { CURVA, calcularMenBonus, type InsumosCurva } from "@/lib/curva";

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Recalcula el bonus de MEN de TODOS los jugadores activos a partir de su
 * asistencia reciente (ventana móvil). Lo corre el cron diario. Idempotente:
 * el bonus se recalcula desde cero, así que correrlo varias veces no desvía.
 */
export async function recalcularMenDiario(): Promise<{ actualizados: number }> {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() - CURVA.VENTANA_DIAS * DIA_MS);

  const [activos, asistencias] = await Promise.all([
    idsJugadoresActivos(),
    asistenciasRecientesGlobal(desde),
  ]);

  // Agregación en memoria por jugador (una sola lectura de asistencias).
  const insumos = new Map<string, InsumosCurva>();
  for (const a of asistencias) {
    const cur = insumos.get(a.jugadorId) ?? { entrenos: 0, partidos: 0, ausencias: 0 };
    if (!a.presente) cur.ausencias++;
    else if (a.evento.tipo === "PARTIDO") cur.partidos++;
    else if (a.evento.tipo === "ENTRENAMIENTO") cur.entrenos++;
    insumos.set(a.jugadorId, cur);
  }

  let actualizados = 0;
  for (const j of activos) {
    const bonus = calcularMenBonus(
      insumos.get(j.id) ?? { entrenos: 0, partidos: 0, ausencias: 0 },
    );
    await actualizarMenBonus(j.id, bonus, ahora);
    actualizados++;
  }
  return { actualizados };
}
