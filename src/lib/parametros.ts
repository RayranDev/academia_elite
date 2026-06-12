/**
 * Mezcla de parámetros globales (Súper Admin) con overrides por escuela (M9).
 * Puro y testeable. Solo `RANGO_*` y `UMBRAL_*` son overrideables por escuela:
 * `PESO_MEN_EN_OVR` queda global para que el OVR sea comparable entre escuelas.
 */

/** ¿La clave puede sobreescribirse a nivel de escuela? */
export function claveOverrideable(clave: string): boolean {
  return clave.startsWith("RANGO_") || clave.startsWith("UMBRAL_");
}

/**
 * Combina valores globales con los overrides de la escuela. El override solo
 * gana si la clave es overrideable; cualquier otra clave conserva el global.
 */
export function mezclarParametros(
  global: Record<string, number>,
  override: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...global };
  for (const [clave, valor] of Object.entries(override)) {
    if (claveOverrideable(clave)) out[clave] = valor;
  }
  return out;
}

export interface FilaParametro {
  clave: string;
  valorGlobal: number | null;
  valorOverride: number | null;
  valorEfectivo: number | null;
  origen: "escuela" | "global" | "defecto";
}

/**
 * Para la UI de métricas: por cada clave pedida, su valor global, el override y
 * el efectivo (override si existe, si no el global). `origen` indica de dónde
 * sale el valor mostrado.
 */
export function resolverParametros(
  claves: string[],
  global: Record<string, number>,
  override: Record<string, number>,
): FilaParametro[] {
  return claves.map((clave) => {
    const vGlobal = clave in global ? global[clave] : null;
    const vOverride =
      claveOverrideable(clave) && clave in override ? override[clave] : null;
    const efectivo = vOverride ?? vGlobal;
    return {
      clave,
      valorGlobal: vGlobal,
      valorOverride: vOverride,
      valorEfectivo: efectivo,
      origen: vOverride != null ? "escuela" : vGlobal != null ? "global" : "defecto",
    };
  });
}
