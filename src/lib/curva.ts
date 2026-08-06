/**
 * Curva de desarrollo: el esfuerzo del jugador (asistencia a entrenamientos y
 * partidos) hace crecer su MEN entre evaluaciones, de forma ACOTADA y
 * RECUPERABLE. Librería PURA (sin Prisma ni efectos).
 *
 * El bonus se RECALCULA desde la ventana móvil (idempotente): no hay estado que
 * acumular, así que el cron puede correr cuantas veces quiera sin desviar el
 * valor. La "recuperación" es natural: al sumar asistencias y al envejecer las
 * ausencias fuera de la ventana, el bonus vuelve a subir.
 *
 * Valores por defecto; en una fase futura podrían bajar a parámetros por escuela.
 */
export const CURVA = {
  /** Ventana móvil (días) sobre la que se mira la asistencia reciente. */
  VENTANA_DIAS: 30,
  /** Puntos de MEN que suma cada entrenamiento asistido. */
  GANANCIA_ENTRENO: 0.6,
  /** Puntos de MEN que suma cada partido asistido. */
  GANANCIA_PARTIDO: 1.2,
  /** Tope del bonus (acota el efecto de la curva sobre el OVR). */
  TOPE_MEN_BONUS: 12,
  /** Se penaliza a partir de la 3ª ausencia (más de 2). */
  UMBRAL_AUSENCIAS: 2,
  /** Penalización por cada ausencia por encima del umbral. */
  PENAL_POR_AUSENCIA: 1.5,
  /** Puntos de MEN por cada gol marcado (etapa 2: rendimiento → progreso). */
  GANANCIA_GOL: 0.5,
  /** Puntos de MEN por cada asistencia de gol dada. */
  GANANCIA_ASISTENCIA_GOL: 0.3,
  /** Penalización por cada tarjeta roja — chica y recuperable, son menores. */
  PENAL_ROJA: 1.0,
  /** Tope propio del bonus de rendimiento, separado del de asistencia. */
  TOPE_RENDIMIENTO_BONUS: 6,
} as const;

/**
 * Forma ancha de `CURVA` (mismas keys, valores `number` en vez de literales)
 * para que se le puedan pasar valores resueltos por escuela (overrides de
 * BD), no solo las constantes literales de arriba.
 */
export type Curva = { [K in keyof typeof CURVA]: number };

export interface InsumosCurva {
  /** Entrenamientos asistidos (presente) en la ventana. */
  entrenos: number;
  /** Partidos asistidos (presente) en la ventana. */
  partidos: number;
  /** Convocatorias con asistencia marcada como ausente en la ventana. */
  ausencias: number;
}

/**
 * Bonus de MEN (0 … TOPE_MEN_BONUS) recalculado desde la ventana. Gana por
 * asistencia; decae solo si las ausencias superan el umbral (>2), a un ritmo
 * recuperable (la ganancia por volver supera la penalización). Redondeado a 1
 * decimal; nunca negativo, nunca por encima del tope. Acepta una `curva`
 * opcional (default `CURVA`, el global) para permitir los 5 parámetros
 * overrideables por escuela (M-pesos de la curva).
 */
export function calcularMenBonus(
  { entrenos, partidos, ausencias }: InsumosCurva,
  curva: Curva = CURVA,
): number {
  const ganado = entrenos * curva.GANANCIA_ENTRENO + partidos * curva.GANANCIA_PARTIDO;
  const exceso = Math.max(0, ausencias - curva.UMBRAL_AUSENCIAS);
  const penalizacion = exceso * curva.PENAL_POR_AUSENCIA;
  const bonus = ganado - penalizacion;
  return Math.max(0, Math.min(curva.TOPE_MEN_BONUS, Math.round(bonus * 10) / 10));
}

export interface InsumosRendimiento {
  /** Goles marcados en la ventana. */
  goles: number;
  /** Asistencias de gol (pase-gol) dadas en la ventana. Nombrado
   * `asistenciasGol` (no `asistencias` a secas) para no confundirlo con
   * `InsumosCurva.partidos`/`entrenos` — acá "asistencia" es una acción de
   * juego, no presencia en un evento. */
  asistenciasGol: number;
  /** Tarjetas rojas recibidas en la ventana. */
  rojas: number;
}

/**
 * Bonus de MEN por rendimiento en cancha (0 … TOPE_RENDIMIENTO_BONUS),
 * separado del bonus por asistencia (`calcularMenBonus`) — no comparten
 * tope, se sacan de una ventana al mismo momento y se SUMAN afuera de esta
 * función. Sin normalizar por categoría a propósito (decisión de
 * producto): el MEN mide constancia/compromiso propio, no compara
 * jugadores entre sí ni entre categorías. Acepta una `curva` opcional
 * (default `CURVA`) por la misma razón que `calcularMenBonus`: aunque
 * `GANANCIA_GOL`/`GANANCIA_ASISTENCIA_GOL`/`PENAL_ROJA` no son overrideables
 * por escuela, se leen de `curva.*` (no de `CURVA.*` directo) para que el
 * objeto pasado sea siempre autoconsistente.
 */
export function calcularRendimientoBonus(
  { goles, asistenciasGol, rojas }: InsumosRendimiento,
  curva: Curva = CURVA,
): number {
  const ganado = goles * curva.GANANCIA_GOL + asistenciasGol * curva.GANANCIA_ASISTENCIA_GOL;
  const penalizacion = rojas * curva.PENAL_ROJA;
  const bonus = ganado - penalizacion;
  return Math.max(0, Math.min(curva.TOPE_RENDIMIENTO_BONUS, Math.round(bonus * 10) / 10));
}

export interface ProyeccionCurva {
  /** Bonus de MEN actual ya ganado (entero, para mostrar). */
  bonusActual: number;
  /** Tope alcanzable. */
  tope: number;
  /** true si las ausencias (>2) están frenando el crecimiento. */
  frenadoPorAusencias: boolean;
  /** Cuánto sumaría el próximo entrenamiento / partido. */
  gananciaProximoEntreno: number;
  gananciaProximoPartido: number;
}

/** Datos para el mensaje motivacional del hub. */
export function proyeccionMen(insumos: InsumosCurva): ProyeccionCurva {
  return {
    bonusActual: Math.round(calcularMenBonus(insumos)),
    tope: CURVA.TOPE_MEN_BONUS,
    frenadoPorAusencias: insumos.ausencias > CURVA.UMBRAL_AUSENCIAS,
    gananciaProximoEntreno: CURVA.GANANCIA_ENTRENO,
    gananciaProximoPartido: CURVA.GANANCIA_PARTIDO,
  };
}

/** Instante de inicio de la ventana móvil de la curva, desde `ahora`. */
export function inicioVentanaCurva(ahora: Date): Date {
  return new Date(ahora.getTime() - CURVA.VENTANA_DIAS * 24 * 60 * 60 * 1000);
}

/** Fila cruda de asistencia (evento + presente) para agregar por jugador. */
export interface AsistenciaCruda {
  jugadorId: string;
  presente: boolean;
  evento: { tipo: string };
}

/** Fila cruda de estadística de partido para agregar por jugador. */
export interface EstadisticaCruda {
  jugadorId: string;
  goles: number;
  asistencias: number;
  roja: boolean;
}

/**
 * Agrega asistencias + estadísticas de partido por jugador, en los insumos
 * que ya consumen `calcularMenBonus`/`calcularRendimientoBonus`. Reusada por
 * el cron diario (todos los jugadores) y por la vista de seguimiento del DT
 * (jugadores de su plantilla) para no duplicar la lógica de agregación.
 */
export function agregarInsumosPorJugador(
  asistencias: AsistenciaCruda[],
  estadisticas: EstadisticaCruda[],
): Map<string, { asistencia: InsumosCurva; rendimiento: InsumosRendimiento }> {
  const mapa = new Map<string, { asistencia: InsumosCurva; rendimiento: InsumosRendimiento }>();
  const obtener = (id: string) => {
    let v = mapa.get(id);
    if (!v) {
      v = {
        asistencia: { entrenos: 0, partidos: 0, ausencias: 0 },
        rendimiento: { goles: 0, asistenciasGol: 0, rojas: 0 },
      };
      mapa.set(id, v);
    }
    return v;
  };
  for (const a of asistencias) {
    const cur = obtener(a.jugadorId).asistencia;
    if (!a.presente) cur.ausencias++;
    else if (a.evento.tipo === "PARTIDO") cur.partidos++;
    else if (a.evento.tipo === "ENTRENAMIENTO") cur.entrenos++;
  }
  for (const e of estadisticas) {
    const cur = obtener(e.jugadorId).rendimiento;
    cur.goles += e.goles;
    cur.asistenciasGol += e.asistencias;
    if (e.roja) cur.rojas++;
  }
  return mapa;
}
