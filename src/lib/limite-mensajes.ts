import type { Rol } from "@/types";

/**
 * Mensajes por hora y usuario. La familia envía pocos; el staff (DT/escuela/
 * soporte) contesta a muchas familias seguidas y no debe toparse con el tope
 * en un día normal. El tope existe para frenar el spam de una cuenta
 * comprometida, no para racionar el uso legítimo.
 */
export function limiteMensajesPorHora(rol: Rol): number {
  return rol === "JUGADOR" ? 30 : 120;
}
