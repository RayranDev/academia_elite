import type { AuthContext } from "@/lib/auth/context";
import type { Rol } from "@/types";
import { ForbiddenError, TenantMismatchError } from "@/lib/errors";

/**
 * Guards de RBAC (Barrera 2 — la seguridad real). Funciones puras, 100% testeadas.
 * Se invocan al inicio de toda Server Action / route handler / servicio.
 */

/** Exige que el rol del usuario esté entre los permitidos. 403 si no. */
export function requireRole(ctx: AuthContext, roles: Rol[]): void {
  if (!roles.includes(ctx.rol)) {
    throw new ForbiddenError();
  }
}

/**
 * Verifica que el recurso pertenece al tenant del usuario.
 * SUPER_ADMIN (escuelaId null) puede cruzar tenants (auditado aparte).
 * Cualquier otro cruce devuelve 404 (no confirmar existencia del recurso).
 */
export function assertTenant(ctx: AuthContext, recursoEscuelaId: string): void {
  if (ctx.rol === "SUPER_ADMIN") return;
  if (ctx.escuelaId === null || ctx.escuelaId !== recursoEscuelaId) {
    throw new TenantMismatchError();
  }
}

/**
 * El padre/jugador solo puede operar sobre sus propios jugadores.
 * `jugadoresPropios` son los ids vinculados al usuario (hijos o su cuenta).
 */
export function assertOwnPlayer(
  _ctx: AuthContext,
  jugadorId: string,
  jugadoresPropios: string[],
): void {
  if (!jugadoresPropios.includes(jugadorId)) {
    throw new TenantMismatchError();
  }
}

/**
 * Devuelve el escuelaId del contexto garantizando que exista (todo rol salvo
 * SUPER_ADMIN tiene escuela). Útil para acotar consultas de tenant.
 */
export function requireEscuela(ctx: AuthContext): string {
  if (!ctx.escuelaId) throw new ForbiddenError();
  return ctx.escuelaId;
}
