import type { Nivel } from "@/types";

/** Umbrales de OVR que separan los niveles de carta. */
export interface UmbralesNivel {
  plata: number;
  oro: number;
  heroe: number;
}

/**
 * Umbrales por defecto (Sección 8.5): Bronce <65 · Plata 65–74 · Oro 75–84 ·
 * Héroe ≥85. Editables por parámetro (global y por escuela). La curva se hace
 * más exigente al subir: pasar a Plata es más fácil que llegar a Héroe.
 */
export const UMBRALES_DEFECTO: UmbralesNivel = { plata: 65, oro: 75, heroe: 85 };

/** Claves en ParametroFormula / ParametroEscuela para los umbrales. */
export const CLAVE_UMBRAL: Record<keyof UmbralesNivel, string> = {
  plata: "UMBRAL_PLATA",
  oro: "UMBRAL_ORO",
  heroe: "UMBRAL_HEROE",
};

/** Nivel de carta por OVR según los umbrales (por defecto, los embebidos). */
export function nivelPorOvr(
  ovr: number,
  umbrales: UmbralesNivel = UMBRALES_DEFECTO,
): Nivel {
  if (ovr >= umbrales.heroe) return "HEROE";
  if (ovr >= umbrales.oro) return "ORO";
  if (ovr >= umbrales.plata) return "PLATA";
  return "BRONCE";
}

/**
 * Construye los umbrales desde valores en BD (`clave → valor`), con fallback a
 * los embebidos. Sanea el orden (plata < oro < heroe): si algún valor rompe la
 * monotonía, cae al defecto para no producir niveles incoherentes. Pura.
 */
export function umbralesDesdeParametros(
  valores: Record<string, number>,
): UmbralesNivel {
  const leer = (k: keyof UmbralesNivel) => {
    const v = valores[CLAVE_UMBRAL[k]];
    return typeof v === "number" && Number.isFinite(v) ? v : UMBRALES_DEFECTO[k];
  };
  const candidato: UmbralesNivel = {
    plata: leer("plata"),
    oro: leer("oro"),
    heroe: leer("heroe"),
  };
  if (candidato.plata < candidato.oro && candidato.oro < candidato.heroe) {
    return candidato;
  }
  return UMBRALES_DEFECTO;
}
