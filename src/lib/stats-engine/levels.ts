import type { Nivel } from "@/types";

/** Nivel de carta por OVR (Sección 8.5): Bronce <65 · Plata 65–74 · Oro 75–84 · Héroe ≥85. */
export function nivelPorOvr(ovr: number): Nivel {
  if (ovr >= 85) return "HEROE";
  if (ovr >= 75) return "ORO";
  if (ovr >= 65) return "PLATA";
  return "BRONCE";
}
