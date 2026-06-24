import type { AuthContext } from "@/lib/auth/context";
import { PERMISOS, type Permiso, type Rol } from "@/types";
import { ForbiddenError, TenantMismatchError, ValidationError } from "@/lib/errors";

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
 * SUPER_ADMIN: NO tiene acceso ambiental (ROL-SUPER-ADMIN.md M2). Solo accede al
 * detalle de un tenant a través de una sesión de soporte activa para ESA escuela;
 * sin sesión lanza ForbiddenError, y contra otra escuela lanza TenantMismatchError.
 * Cualquier otro cruce devuelve 404 (no confirmar existencia del recurso).
 */
export function assertTenant(ctx: AuthContext, recursoEscuelaId: string): void {
  if (ctx.rol === "SUPER_ADMIN") {
    if (!ctx.soporte) throw new ForbiddenError("Abre una sesión de soporte.");
    if (ctx.soporte.escuelaId !== recursoEscuelaId) {
      throw new TenantMismatchError();
    }
    return;
  }
  if (ctx.escuelaId === null || ctx.escuelaId !== recursoEscuelaId) {
    throw new TenantMismatchError();
  }
}

/**
 * Respeta el solo-lectura de la sesión de soporte (M2). Una sesión de soporte de
 * un SUPER_ADMIN empieza en solo-lectura; escribir requiere haberla habilitado.
 * No-op para el resto de los roles.
 */
export function assertSoportePuedeEscribir(ctx: AuthContext): void {
  if (ctx.rol === "SUPER_ADMIN" && ctx.soporte?.soloLectura) {
    throw new ForbiddenError("Sesión de soporte en solo lectura.");
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

/**
 * Acceso de soporte (ROL-SUPER-ADMIN.md M1). Cuando un SUPER_ADMIN escribe sobre
 * datos operativos de un tenant, debe justificarlo con un motivo (que luego se
 * audita). Sin motivo, la acción se rechaza: el cruce de tenant nunca es silencioso.
 * Para el resto de los roles es un no-op (operan en su propia escuela).
 */
export function assertMotivoSoporte(ctx: AuthContext, motivo?: string | null): void {
  if (ctx.rol === "SUPER_ADMIN" && !motivo?.trim()) {
    throw new ValidationError("El soporte requiere un motivo.");
  }
}

/**
 * Mapa rol → permisos (ROL-SUPER-ADMIN.md M4). Hoy el SUPER_ADMIN concentra todos
 * los permisos de plataforma (derivados de `PERMISOS`, así hereda los nuevos); el
 * resto de los roles operan dentro de su escuela por rol/tenant y no tienen
 * permisos de plataforma. Para partir el rol mañana, basta crear un rol acotado
 * acá: las acciones ya consultan permisos, no el string del rol.
 */
const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  SUPER_ADMIN: PERMISOS,
  ESCUELA_ADMIN: [],
  DT: [],
  JUGADOR: [],
};

/** ¿El rol del usuario tiene el permiso de plataforma indicado? */
export function tienePermiso(ctx: AuthContext, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[ctx.rol].includes(permiso);
}

/**
 * Exige un permiso de plataforma (M4). 403 si el rol no lo tiene. Reemplaza a
 * `requireRole(ctx, ["SUPER_ADMIN"])` en las acciones de plataforma, para no atar
 * cada guard al string del rol.
 */
export function requirePermiso(ctx: AuthContext, permiso: Permiso): void {
  if (!tienePermiso(ctx, permiso)) {
    throw new ForbiddenError();
  }
}
