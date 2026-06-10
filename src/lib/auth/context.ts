import type { Rol } from "@/types";

/**
 * Contexto de autorización que recibe TODA función de servicio (Capa 3) como
 * primer argumento. Se construye SIEMPRE desde la sesión (Capa 2), nunca del body.
 */
export interface AuthContext {
  userId: string;
  rol: Rol;
  escuelaId: string | null; // null SOLO para SUPER_ADMIN
  entrenadorId?: string; // presente si rol === "DT"
  jugadorId?: string; // presente si rol === "JUGADOR"
}
