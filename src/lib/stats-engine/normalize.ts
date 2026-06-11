import type { RangoFisico } from "./types";

export const PISO_FISICO = 40;
export const TECHO = 99;
export const PISO_TECNICA = 1;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Normaliza una medida física cruda a la escala [40, 99].
 * Las pruebas inversas (menos = mejor) se invierten antes de normalizar.
 */
export function normalizaFisica(valor: number, rango: RangoFisico): number {
  const { min, max, inverso } = rango;
  const span = max - min || 1;
  const frac = inverso ? (max - valor) / span : (valor - min) / span;
  const fracClamp = clamp(frac, 0, 1);
  return Math.round(PISO_FISICO + fracClamp * (TECHO - PISO_FISICO));
}

/**
 * Normaliza una nota técnica/mentalidad (1-10) a la escala [1, 99]: nota × 9.9.
 */
export function normalizaNota(nota: number): number {
  return clamp(Math.round(nota * 9.9), PISO_TECNICA, TECHO);
}
