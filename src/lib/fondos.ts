/**
 * Reglas (puras, testeables) para los fondos de carta desbloqueables. El
 * requisito de cada fondo es configurable: SIEMPRE, LOGRO (código), NIVEL_CARTA
 * (Bronce/Plata/Oro/Héroe) o NIVEL_PERSONAL (nivel mínimo de progreso).
 */
import type { Nivel } from "@/types";

export type RequisitoFondo = "SIEMPRE" | "LOGRO" | "NIVEL_CARTA" | "NIVEL_PERSONAL";

export const ORDEN_NIVEL: Nivel[] = ["BRONCE", "PLATA", "ORO", "HEROE"];

/** ¿El nivel de carta `actual` alcanza o supera al `requerido`? */
export function nivelAlcanza(actual: Nivel | null, requerido: string): boolean {
  const a = ORDEN_NIVEL.indexOf((actual ?? "BRONCE") as Nivel);
  const r = ORDEN_NIVEL.indexOf(requerido as Nivel);
  return r >= 0 && a >= r;
}

export interface EstadoMeritos {
  logros: Set<string>; // códigos de logro obtenidos
  nivelCarta: Nivel | null; // nivel de la carta actual
  nivelPersonal: number; // nivel de progreso personal
}

export interface ReglaFondo {
  requisitoTipo: string;
  requisitoValor: string | null;
}

/** ¿El jugador cumple el requisito del fondo? */
export function fondoDesbloqueado(f: ReglaFondo, e: EstadoMeritos): boolean {
  switch (f.requisitoTipo) {
    case "SIEMPRE":
      return true;
    case "LOGRO":
      return !!f.requisitoValor && e.logros.has(f.requisitoValor);
    case "NIVEL_CARTA":
      return !!f.requisitoValor && nivelAlcanza(e.nivelCarta, f.requisitoValor);
    case "NIVEL_PERSONAL":
      return e.nivelPersonal >= Number(f.requisitoValor ?? 0);
    default:
      return false;
  }
}

const ETIQUETA_NIVEL: Record<string, string> = {
  BRONCE: "Bronce",
  PLATA: "Plata",
  ORO: "Oro",
  HEROE: "Héroe",
};

/** Texto del requisito para la UI (qué hace falta para desbloquearlo). */
export function requisitoTexto(f: ReglaFondo, nombreLogro?: string): string {
  switch (f.requisitoTipo) {
    case "SIEMPRE":
      return "Disponible para todos";
    case "LOGRO":
      return `Logro: ${nombreLogro ?? f.requisitoValor ?? "—"}`;
    case "NIVEL_CARTA":
      return `Carta nivel ${ETIQUETA_NIVEL[f.requisitoValor ?? ""] ?? f.requisitoValor} o superior`;
    case "NIVEL_PERSONAL":
      return `Nivel personal ${f.requisitoValor ?? "?"}`;
    default:
      return "Requisito desconocido";
  }
}
