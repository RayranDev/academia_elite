import type { AuthContext } from "@/lib/auth/context";

// Permiso puro para servir/gestionar la foto de un jugador. Vive aparte de
// `foto.service.ts` a propósito: ese módulo arrastra `sharp` (procesamiento de
// imagen, nativo) y la RUTA que sólo SIRVE la foto no debe cargar sharp — en
// serverless (Vercel) ese import nativo rompía la función con 500.

/** ¿El usuario es el responsable (padre/tutor) del jugador? */
export function esResponsable(
  ctx: AuthContext,
  jugador: { padreUserId: string | null; cuentaUserId: string | null },
): boolean {
  return ctx.userId === jugador.padreUserId || ctx.userId === jugador.cuentaUserId;
}
