import { NIVELES, type PlayerCardData, type Nivel } from "@/types";
import { aPlayerCardData } from "@/lib/mappers/player-card";

interface StatsRow {
  rit: number;
  tir: number;
  pas: number;
  reg: number;
  def: number;
  fis: number;
  men: number;
  ovr: number;
  nivel: string;
}

interface EvaluacionRow {
  fecha: Date;
  statsCalculados: StatsRow | null;
}

interface JugadorRow {
  nombre: string;
  apellido: string;
  posicion: string;
  dorsal: number | null;
  fotoUrl: string | null;
  genero?: string | null;
  avatarConfig?: string | null;
}

export interface HistoriaCartaItemDTO {
  /** Instante de la evaluación (no día de almanaque) → se muestra con FechaLocal. */
  fecha: string;
  ovr: number;
  nivel: Nivel;
  /** Diferencia de OVR vs. la evaluación anterior; null en la primera. */
  delta: number | null;
  subioNivel: boolean;
  bajoNivel: boolean;
  card: PlayerCardData;
}

/**
 * Historia de la carta: una mini-carta por evaluación, ordenadas de más vieja
 * a más nueva (mismo orden que `listarEvaluacionesJugador`, que ya trae
 * `orderBy: { fecha: "asc" }`).
 *
 * Los STATS de cada mini-carta son el snapshot guardado en `StatsCalculados`
 * de ESA evaluación puntual — nunca se recalculan con los parámetros
 * actuales del motor, para que recalibrar (umbrales, pesos) nunca reescriba
 * la historia ya jugada.
 *
 * La identidad VISUAL (foto/avatar/escudo/fondo equipado) sí es la actual del
 * jugador: es la misma persona en todas las mini-cartas, y no tiene sentido
 * guardar un snapshot de avatar por evaluación (decisión de producto).
 */
export function aHistoriaCarta(
  evaluaciones: EvaluacionRow[],
  jugador: JugadorRow,
  fotoUrl: string | null,
  escudoEscuelaUrl?: string,
): HistoriaCartaItemDTO[] {
  const conStats = evaluaciones.filter(
    (e): e is EvaluacionRow & { statsCalculados: StatsRow } => !!e.statsCalculados,
  );

  let ovrAnterior: number | null = null;
  let nivelAnterior: Nivel | null = null;

  return conStats.map((e) => {
    const stats = e.statsCalculados;
    const nivel = stats.nivel as Nivel;
    const delta = ovrAnterior === null ? null : stats.ovr - ovrAnterior;
    const subioNivel =
      nivelAnterior !== null && NIVELES.indexOf(nivel) > NIVELES.indexOf(nivelAnterior);
    const bajoNivel =
      nivelAnterior !== null && NIVELES.indexOf(nivel) < NIVELES.indexOf(nivelAnterior);

    ovrAnterior = stats.ovr;
    nivelAnterior = nivel;

    return {
      fecha: e.fecha.toISOString(),
      ovr: stats.ovr,
      nivel,
      delta,
      subioNivel,
      bajoNivel,
      card: aPlayerCardData(jugador, stats, fotoUrl, escudoEscuelaUrl),
    };
  });
}
