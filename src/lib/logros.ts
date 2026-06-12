// Reglas puras de disponibilidad de logros (G6). Testeadas en unit.

export interface VentanaLogro {
  activo: boolean;
  desde: Date | null;
  hasta: Date | null;
}

/**
 * ¿La configuración por escuela permite el logro ahora?
 * Sin configuración explícita, el logro está disponible.
 */
export function ventanaActiva(
  config: VentanaLogro | null | undefined,
  ahora: Date,
): boolean {
  if (!config) return true;
  if (!config.activo) return false;
  if (config.desde && ahora < config.desde) return false;
  if (config.hasta && ahora > config.hasta) return false;
  return true;
}

/** ¿El logro aplica a la posición del jugador? (null = general). */
export function logroAplicaAPosicion(
  logroPosicion: string | null,
  posicionJugador: string,
): boolean {
  return !logroPosicion || logroPosicion === posicionJugador;
}

/**
 * Disponibilidad total de un logro para una escuela en un momento dado:
 * activo en el catálogo, del catálogo global o propio de ESA escuela, y
 * dentro de la ventana configurada (si la hay).
 */
export function logroDisponibleParaEscuela(
  logro: { activo: boolean; escuelaId: string | null },
  escuelaId: string,
  config: VentanaLogro | null | undefined,
  ahora: Date,
): boolean {
  if (!logro.activo) return false;
  if (logro.escuelaId && logro.escuelaId !== escuelaId) return false;
  return ventanaActiva(config, ahora);
}
