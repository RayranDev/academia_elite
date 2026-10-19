import type { AuthContext } from "@/lib/auth/context";
import { assertTenant } from "@/lib/auth/guards";
import { DomainError } from "@/lib/errors";

// Permiso puro para servir/gestionar la foto de un jugador. Vive aparte de
// `foto.service.ts` a propósito: ese módulo arrastra `sharp` (procesamiento de
// imagen, nativo) y la RUTA que sólo SIRVE la foto no debe cargar sharp — en
// serverless (Vercel) ese import nativo rompía la función con 500.

/**
 * ¿Puede este usuario ver la foto del jugador? Tenant primero (el SUPER_ADMIN
 * solo entra con una sesión de soporte abierta para ESA escuela, igual que
 * `assertTenant`); después, el responsable siempre y el staff solo con
 * consentimiento vigente.
 */
export function puedeVerFoto(
  ctx: AuthContext,
  jugador: {
    escuelaId: string;
    padreUserId: string | null;
    cuentaUserId: string | null;
    consentimientoFoto: boolean;
  },
): boolean {
  try {
    assertTenant(ctx, jugador.escuelaId);
  } catch (e) {
    // Solo los rechazos de dominio (rol/tenant) son un "no". Cualquier otra
    // falla es un bug y debe verse, no disfrazarse de foto inexistente.
    if (e instanceof DomainError) return false;
    throw e;
  }
  if (esResponsable(ctx, jugador)) return true;
  return (
    jugador.consentimientoFoto &&
    (ctx.rol === "DT" || ctx.rol === "ESCUELA_ADMIN" || ctx.rol === "SUPER_ADMIN")
  );
}

/** ¿El usuario es el responsable (padre/tutor) del jugador? */
export function esResponsable(
  ctx: AuthContext,
  jugador: { padreUserId: string | null; cuentaUserId: string | null },
): boolean {
  return ctx.userId === jugador.padreUserId || ctx.userId === jugador.cuentaUserId;
}
