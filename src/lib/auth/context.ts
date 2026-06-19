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
  // Presente solo si un SUPER_ADMIN tiene una sesión de soporte activa (M2).
  // Es la puerta explícita por la que accede a los datos de una escuela.
  soporte?: { sesionId: string; escuelaId: string; soloLectura: boolean };
}
