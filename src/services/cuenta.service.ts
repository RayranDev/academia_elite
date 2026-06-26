import type { AuthContext } from "@/lib/auth/context";
import { ValidationError } from "@/lib/errors";
import {
  obtenerPasswordHash,
  actualizarPasswordUser,
  obtenerUserSeguro,
} from "@/repositories/user.repository";
import { registrarAuditoria } from "@/services/audit.service";
import {
  hashPassword,
  verifyPassword,
  isCommonPassword,
} from "@/lib/auth/password";

export interface EstadoBloqueoDTO {
  rol: string;
  bloqueado: boolean;
  bloqueoTipo: string | null;
  bloqueoMensaje: string | null;
}

/** Estado de bloqueo del usuario (pantalla de acceso suspendido). DTO plano. */
export async function obtenerEstadoBloqueo(
  userId: string,
): Promise<EstadoBloqueoDTO | null> {
  const user = await obtenerUserSeguro(userId);
  if (!user) return null;
  return {
    rol: user.rol,
    bloqueado: user.bloqueado,
    bloqueoTipo: user.bloqueoTipo,
    bloqueoMensaje: user.bloqueoMensaje,
  };
}

/** Cambio de contraseña propio ("Mi cuenta", G10). Cualquier rol. Auditado. */
export async function cambiarMiPassword(
  ctx: AuthContext,
  actual: string,
  nueva: string,
): Promise<void> {
  const user = await obtenerPasswordHash(ctx.userId);
  if (!user) throw new ValidationError("Sesión inválida.");

  if (!(await verifyPassword(actual, user.passwordHash))) {
    throw new ValidationError("La contraseña actual no es correcta.");
  }
  if (isCommonPassword(nueva)) {
    throw new ValidationError("Esa contraseña es demasiado común.");
  }
  if (actual === nueva) {
    throw new ValidationError("La nueva contraseña debe ser distinta.");
  }

  await actualizarPasswordUser(ctx.userId, await hashPassword(nueva));
  await registrarAuditoria(ctx, {
    accion: "CAMBIAR_PASSWORD",
    entidad: "User",
    entidadId: ctx.userId,
    escuelaId: ctx.escuelaId,
  });
}
