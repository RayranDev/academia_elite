import type { Posicion } from "@/types";

/**
 * Ponderaciones de OVR por posición (Sección 8.4). Cada fila suma 1.0.
 * Orden: RIT, TIR, PAS, REG, DEF, FIS.
 */
export const PESOS_POSICION: Record<
  Posicion,
  { rit: number; tir: number; pas: number; reg: number; def: number; fis: number }
> = {
  POR: { rit: 0.1, tir: 0.05, pas: 0.15, reg: 0.1, def: 0.35, fis: 0.25 },
  DEF: { rit: 0.15, tir: 0.05, pas: 0.15, reg: 0.1, def: 0.35, fis: 0.2 },
  MED: { rit: 0.15, tir: 0.15, pas: 0.3, reg: 0.2, def: 0.1, fis: 0.1 },
  DEL: { rit: 0.2, tir: 0.3, pas: 0.15, reg: 0.2, def: 0.05, fis: 0.1 },
};

/**
 * Derivación de los 6 stats de carta a partir de las medidas normalizadas
 * (físicas en [40,99]: vel/pot/agi/res; técnicas en [1,99]: ctrl/pas/tir/reg).
 * Cada fórmula es una media ponderada (suma 1.0), por lo que el resultado
 * permanece en rango sin necesidad de re-escalar. (Motor v1.1.)
 */
export interface MedidasNormalizadas {
  vel: number; // sprint
  pot: number; // salto
  agi: number; // agilidad
  res: number; // yoyo
  ctrl: number;
  pasT: number;
  tirT: number;
  regT: number;
}

/** Los 6 stats de carta, en el orden en que se muestran. */
export const STATS_DERIVADOS = ["rit", "tir", "pas", "reg", "def", "fis"] as const;
export type StatDerivado = (typeof STATS_DERIVADOS)[number];

/** Coeficientes de una derivación: por stat, qué medida pesa cuánto. */
export type Coeficientes = Record<
  StatDerivado,
  Partial<Record<keyof MedidasNormalizadas, number>>
>;

/**
 * Coeficientes de la derivación de JUGADOR DE CAMPO. Cada fila suma 1.0, así que
 * el resultado queda en rango sin re-escalar.
 *
 * Viven como DATO y no incrustados en la función a propósito: la planilla Excel
 * (`plantilla-simulador.service.ts`) replica estas mismas fórmulas, y leyendo de
 * acá no pueden divergir. Si estuvieran escritos dos veces, cambiar uno dejaría
 * al otro mintiendo en silencio — y una planilla que miente es peor que ninguna,
 * porque el número se cree.
 */
export const COEF_CAMPO: Coeficientes = {
  rit: { vel: 0.65, agi: 0.35 },
  tir: { tirT: 0.75, pot: 0.25 },
  pas: { pasT: 0.75, ctrl: 0.25 },
  reg: { regT: 0.55, agi: 0.25, ctrl: 0.2 },
  def: { res: 0.45, pot: 0.3, ctrl: 0.25 },
  fis: { res: 0.5, pot: 0.35, vel: 0.15 },
};

/**
 * Coeficientes del PORTERO. Mismas cuatro columnas técnicas, otro oficio:
 * `ctrl` es blocaje, `pasT` distribución, `tirT` juego aéreo y `regT` achique.
 */
export const COEF_PORTERO: Coeficientes = {
  // Achique y reacción: llegar antes que el delantero.
  rit: { agi: 0.6, vel: 0.4 },
  // Despeje de puños y salida aérea; el salto manda tanto como la técnica.
  tir: { tirT: 0.6, pot: 0.4 },
  // Distribución: saque de mano y de pie. La potencia ayuda al saque largo.
  pas: { pasT: 0.8, pot: 0.2 },
  // Salir y ganar el mano a mano.
  reg: { regT: 0.6, agi: 0.4 },
  // El núcleo del arquero: blocaje, agilidad para llegar y juego aéreo.
  def: { ctrl: 0.5, agi: 0.25, tirT: 0.25 },
  // El físico se mide igual que en un jugador de campo.
  fis: { res: 0.5, pot: 0.35, vel: 0.15 },
};

/** Coeficientes que le tocan a una posición. */
export function coeficientesDe(posicion: Posicion): Coeficientes {
  return posicion === "POR" ? COEF_PORTERO : COEF_CAMPO;
}

function aplicar(n: MedidasNormalizadas, coef: Coeficientes) {
  const resultado = {} as Record<StatDerivado, number>;
  for (const stat of STATS_DERIVADOS) {
    let suma = 0;
    for (const [medida, peso] of Object.entries(coef[stat])) {
      suma += n[medida as keyof MedidasNormalizadas] * (peso as number);
    }
    resultado[stat] = suma;
  }
  return resultado;
}

export function derivaStats(n: MedidasNormalizadas) {
  return aplicar(n, COEF_CAMPO);
}

/**
 * Derivación para el PORTERO.
 *
 * Por qué existe: las 4 notas técnicas son las mismas columnas, pero para un
 * arquero el DT no puntúa control/pase/tiro/regate — puntúa blocaje,
 * distribución, juego aéreo y achique (ver `medidasTecnicas()` en
 * `src/lib/medidas-tecnicas.ts`). Con la fórmula de campo, el DEF del arquero
 * —su stat de mayor peso (0.35)— salía de `resistencia Yo-Yo + salto + control`,
 * que no tiene casi nada que ver con su capacidad de evitar un gol.
 *
 * Ponderar distinto una medida equivocada no la arregla: por eso el arquero
 * necesita su propia derivación, no solo su propia fila de pesos.
 *
 * Cada fila suma 1.0, igual que la de campo.
 */
export function derivaStatsPortero(n: MedidasNormalizadas) {
  return aplicar(n, COEF_PORTERO);
}

/** Elige la derivación que corresponde a la posición. */
export function derivaStatsPorPosicion(n: MedidasNormalizadas, posicion: Posicion) {
  return aplicar(n, coeficientesDe(posicion));
}
