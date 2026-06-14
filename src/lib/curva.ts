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
} as const;

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
 * decimal; nunca negativo, nunca por encima del tope.
 */
export function calcularMenBonus({ entrenos, partidos, ausencias }: InsumosCurva): number {
  const ganado = entrenos * CURVA.GANANCIA_ENTRENO + partidos * CURVA.GANANCIA_PARTIDO;
  const exceso = Math.max(0, ausencias - CURVA.UMBRAL_AUSENCIAS);
  const penalizacion = exceso * CURVA.PENAL_POR_AUSENCIA;
  const bonus = ganado - penalizacion;
  return Math.max(0, Math.min(CURVA.TOPE_MEN_BONUS, Math.round(bonus * 10) / 10));
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
