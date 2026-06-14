/** Milisegundos en un día. */
export const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * ¿La última evaluación está vencida? Vencida = la carta es más vieja que la
 * frecuencia (en días) configurada por la escuela. Un jugador SIN evaluación se
 * trata aparte ("sin evaluar", no "vencida"): los llamadores que quieran contar
 * la ausencia como vencida deben chequear `null` antes de llamar a esta función.
 */
export function evaluacionVencida(
  ultimaFecha: Date,
  frecuenciaDias: number,
  ahora: number = Date.now(),
): boolean {
  return ahora - ultimaFecha.getTime() > frecuenciaDias * DIA_MS;
}

/**
 * Porcentaje (0–100) con un decimal. Devuelve 0 si el total es 0 (evita la
 * división por cero). Punto único para que dashboard y reportes coincidan.
 */
export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}
