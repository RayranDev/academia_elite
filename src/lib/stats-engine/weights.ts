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

export function derivaStats(n: MedidasNormalizadas) {
  return {
    rit: n.vel * 0.65 + n.agi * 0.35,
    tir: n.tirT * 0.75 + n.pot * 0.25,
    pas: n.pasT * 0.75 + n.ctrl * 0.25,
    reg: n.regT * 0.55 + n.agi * 0.25 + n.ctrl * 0.2,
    def: n.res * 0.45 + n.pot * 0.3 + n.ctrl * 0.25,
    fis: n.res * 0.5 + n.pot * 0.35 + n.vel * 0.15,
  };
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
  return {
    // Achique y reacción: llegar antes que el delantero.
    rit: n.agi * 0.6 + n.vel * 0.4,
    // Despeje de puños y salida aérea; el salto manda tanto como la técnica.
    tir: n.tirT * 0.6 + n.pot * 0.4,
    // Distribución: saque de mano y de pie. La potencia ayuda al saque largo.
    pas: n.pasT * 0.8 + n.pot * 0.2,
    // Salir y ganar el mano a mano.
    reg: n.regT * 0.6 + n.agi * 0.4,
    // El núcleo del arquero: blocaje, agilidad para llegar y juego aéreo.
    def: n.ctrl * 0.5 + n.agi * 0.25 + n.tirT * 0.25,
    // El físico se mide igual que en un jugador de campo.
    fis: n.res * 0.5 + n.pot * 0.35 + n.vel * 0.15,
  };
}

/** Elige la derivación que corresponde a la posición. */
export function derivaStatsPorPosicion(n: MedidasNormalizadas, posicion: Posicion) {
  return posicion === "POR" ? derivaStatsPortero(n) : derivaStats(n);
}
