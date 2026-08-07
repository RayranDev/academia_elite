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

// --- Rangos editables en BD (G8) -------------------------------------------
// Claves en ParametroFormula: RANGO_<PRUEBA>_<GRUPO>_<MIN|MAX>, p. ej.
// "RANGO_SPRINT_SUB12_MIN". `inverso` no es editable (es propio de la prueba).

export const PRUEBAS_FISICAS = [
  "sprint30mSeg",
  "saltoVerticalCm",
  "agilidadIllinoisSeg",
  "resistenciaYoyoNivel",
] as const;
export type PruebaFisica = (typeof PRUEBAS_FISICAS)[number];

export const CLAVE_PRUEBA: Record<PruebaFisica, string> = {
  sprint30mSeg: "SPRINT",
  saltoVerticalCm: "SALTO",
  agilidadIllinoisSeg: "AGILIDAD",
  resistenciaYoyoNivel: "YOYO",
};

export const ETIQUETA_PRUEBA: Record<PruebaFisica, string> = {
  sprint30mSeg: "Sprint 30 m (segundos)",
  saltoVerticalCm: "Salto vertical (cm)",
  agilidadIllinoisSeg: "Agilidad Illinois (segundos)",
  resistenciaYoyoNivel: "Resistencia Yo-Yo (nivel)",
};

export function claveRango(
  prueba: PruebaFisica,
  grupo: GrupoEdad,
  extremo: "MIN" | "MAX",
): string {
  return `RANGO_${CLAVE_PRUEBA[prueba]}_${grupo}_${extremo}`;
}

/**
 * Construye los rangos de un grupo a partir de los valores en BD
 * (`clave → valor`), con fallback al rango embebido cuando falta alguno.
 * Pura: testeable sin BD.
 */
export function rangosDesdeParametros(
  valores: Record<string, number>,
  grupo: GrupoEdad,
): RangosFisicos {
  const base = RANGOS_POR_GRUPO[grupo];
  const out = {} as RangosFisicos;
  for (const prueba of PRUEBAS_FISICAS) {
    const min = valores[claveRango(prueba, grupo, "MIN")];
    const max = valores[claveRango(prueba, grupo, "MAX")];
    out[prueba] = {
      min: typeof min === "number" ? min : base[prueba].min,
      max: typeof max === "number" ? max : base[prueba].max,
      inverso: base[prueba].inverso,
    };
  }
  return out;
}

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

// --- Rangos por CATEGORÍA (Fase B) -----------------------------------------
// `GrupoEdad`/`RANGOS_POR_GRUPO` ya no son la fuente del rango real de una
// evaluación (eso vive en `CategoriaRangoFisico`, por categoría): quedan como
// semilla al crear una categoría y como modo "global" del simulador.

/** Fila plana (8 campos min/max) — forma en que vive `CategoriaRangoFisico` en BD. */
export interface FilaRangoFisico {
  sprintMin: number;
  sprintMax: number;
  saltoMin: number;
  saltoMax: number;
  agilidadMin: number;
  agilidadMax: number;
  yoyoMin: number;
  yoyoMax: number;
}

/** `inverso` es propio de cada prueba (no editable), igual en todo grupo. */
const INVERSO_PRUEBA: Record<PruebaFisica, boolean> = {
  sprint30mSeg: RANGOS_POR_GRUPO.SUB16.sprint30mSeg.inverso,
  saltoVerticalCm: RANGOS_POR_GRUPO.SUB16.saltoVerticalCm.inverso,
  agilidadIllinoisSeg: RANGOS_POR_GRUPO.SUB16.agilidadIllinoisSeg.inverso,
  resistenciaYoyoNivel: RANGOS_POR_GRUPO.SUB16.resistenciaYoyoNivel.inverso,
};

/** Fila plana de BD → `RangosFisicos` (forma que consume el motor). Pura. */
export function rangosDesdeFila(fila: FilaRangoFisico): RangosFisicos {
  return {
    sprint30mSeg: {
      min: fila.sprintMin,
      max: fila.sprintMax,
      inverso: INVERSO_PRUEBA.sprint30mSeg,
    },
    saltoVerticalCm: {
      min: fila.saltoMin,
      max: fila.saltoMax,
      inverso: INVERSO_PRUEBA.saltoVerticalCm,
    },
    agilidadIllinoisSeg: {
      min: fila.agilidadMin,
      max: fila.agilidadMax,
      inverso: INVERSO_PRUEBA.agilidadIllinoisSeg,
    },
    resistenciaYoyoNivel: {
      min: fila.yoyoMin,
      max: fila.yoyoMax,
      inverso: INVERSO_PRUEBA.resistenciaYoyoNivel,
    },
  };
}

/** `RangosFisicos` → fila plana de BD (descarta `inverso`, fijo por prueba). Pura. */
export function filaDesdeRangos(rangos: RangosFisicos): FilaRangoFisico {
  return {
    sprintMin: rangos.sprint30mSeg.min,
    sprintMax: rangos.sprint30mSeg.max,
    saltoMin: rangos.saltoVerticalCm.min,
    saltoMax: rangos.saltoVerticalCm.max,
    agilidadMin: rangos.agilidadIllinoisSeg.min,
    agilidadMax: rangos.agilidadIllinoisSeg.max,
    yoyoMin: rangos.resistenciaYoyoNivel.min,
    yoyoMax: rangos.resistenciaYoyoNivel.max,
  };
}

/**
 * Semilla del `GrupoEdad` más cercano para una categoría NUEVA, a partir de su
 * rango de años. Solo se usa al crear/backfillear: de ahí en más la categoría
 * vive con sus propios rangos (`CategoriaRangoFisico`), independiente de
 * `GrupoEdad`. Una categoría "sin edad" (`anioDesde`/`anioHasta` null) siembra
 * SUB16 (el rango más amplio, el menos riesgoso como punto de partida).
 */
export function grupoEdadSemilla(
  anioDesde: number | null,
  anioHasta: number | null,
  anioReferencia: number = new Date().getFullYear(),
): GrupoEdad {
  if (anioDesde == null || anioHasta == null) return "SUB16";
  const edad = anioReferencia - (anioDesde + anioHasta) / 2;
  return grupoEdadPorEdad(edad);
}
