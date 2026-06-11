import type { GrupoEdad, RangosFisicos } from "./types";

/**
 * Rangos físicos por grupo de edad (peor↔mejor marca). Valores iniciales
 * razonables (Sección 8.1). El SUPER_ADMIN podrá ajustarlos vía ParametroFormula
 * en una iteración futura; el motor acepta override por `opts.rangos`.
 *
 * `inverso: true` para pruebas donde MENOS es mejor (sprint, agilidad).
 */
export const RANGOS_POR_GRUPO: Record<GrupoEdad, RangosFisicos> = {
  SUB8: {
    sprint30mSeg: { min: 5.0, max: 7.5, inverso: true },
    saltoVerticalCm: { min: 10, max: 30, inverso: false },
    agilidadIllinoisSeg: { min: 17, max: 23, inverso: true },
    resistenciaYoyoNivel: { min: 2, max: 10, inverso: false },
  },
  SUB10: {
    sprint30mSeg: { min: 4.8, max: 7.0, inverso: true },
    saltoVerticalCm: { min: 12, max: 35, inverso: false },
    agilidadIllinoisSeg: { min: 16.5, max: 22, inverso: true },
    resistenciaYoyoNivel: { min: 3, max: 12, inverso: false },
  },
  SUB12: {
    sprint30mSeg: { min: 4.5, max: 6.5, inverso: true },
    saltoVerticalCm: { min: 15, max: 42, inverso: false },
    agilidadIllinoisSeg: { min: 16, max: 21, inverso: true },
    resistenciaYoyoNivel: { min: 4, max: 15, inverso: false },
  },
  SUB14: {
    sprint30mSeg: { min: 4.2, max: 6.0, inverso: true },
    saltoVerticalCm: { min: 20, max: 50, inverso: false },
    agilidadIllinoisSeg: { min: 15.5, max: 20, inverso: true },
    resistenciaYoyoNivel: { min: 5, max: 18, inverso: false },
  },
  SUB16: {
    sprint30mSeg: { min: 4.0, max: 5.6, inverso: true },
    saltoVerticalCm: { min: 25, max: 58, inverso: false },
    agilidadIllinoisSeg: { min: 15, max: 19, inverso: true },
    resistenciaYoyoNivel: { min: 6, max: 20, inverso: false },
  },
};

/** Determina el grupo de edad a partir de la edad en años. */
export function grupoEdadPorEdad(edadAnios: number): GrupoEdad {
  if (edadAnios <= 8) return "SUB8";
  if (edadAnios <= 10) return "SUB10";
  if (edadAnios <= 12) return "SUB12";
  if (edadAnios <= 14) return "SUB14";
  return "SUB16";
}

/** Edad en años a una fecha de referencia. */
export function edadEnAnios(fechaNacimiento: Date, ref: Date = new Date()): number {
  let edad = ref.getFullYear() - fechaNacimiento.getFullYear();
  const m = ref.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < fechaNacimiento.getDate())) edad--;
  return edad;
}
