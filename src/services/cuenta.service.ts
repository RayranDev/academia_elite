import type { AuthContext } from "@/lib/auth/context";
import { ValidationError } from "@/lib/errors";
import {
  obtenerPasswordHash,
  actualizarPasswordUser,
  actualizarUserDatos,
  actualizarEmailUser,
  obtenerUserSeguro,
} from "@/repositories/user.repository";
import { emailExisteGlobal } from "@/repositories/escuela.repository";
import {
  crearTokenAuth,
  buscarTokenVigenteDe,
  marcarTokenUsado,
  invalidarTokensDe,
  incrementarIntentos,
} from "@/repositories/token-auth.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { enviarCodigoCambioEmail } from "@/services/email.service";
import { generarOtp, hashToken } from "@/lib/tokens";
import {
  hashPassword,
  verifyPassword,
  isCommonPassword,
} from "@/lib/auth/password";

// Ventana de validez y tope de intentos del código de cambio de email. Mismos
// valores que el OTP de login: 10 min, 5 intentos antes de invalidarlo.
const TTL_CAMBIO_EMAIL = 10 * 60 * 1000;
const MAX_INTENTOS_CAMBIO_EMAIL = 5;

// El hash incluye el userId para que el tokenHash (@unique) no colisione entre
// usuarios que reciban el mismo código de 6 dígitos.
function hashCodigoEmail(userId: string, codigo: string): string {
  return hashToken(`${userId}:${codigo}`);
}

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

export interface MiCuentaDTO {
  nombre: string;
  email: string;
  emailVerificado: boolean;
}

/** Datos editables de la propia cuenta ("Mi cuenta"). DTO plano. */
export async function obtenerMiCuenta(ctx: AuthContext): Promise<MiCuentaDTO> {
  const user = await obtenerUserSeguro(ctx.userId);
  if (!user) throw new ValidationError("Sesión inválida.");
  return {
    nombre: user.nombre,
    email: user.email,
    emailVerificado: user.emailVerificado,
  };
}

/** Cambia el nombre propio (autoservicio JUGADOR/DT). Auditado. */
export async function actualizarMiNombre(
  ctx: AuthContext,
  nombre: string,
): Promise<void> {
  await actualizarUserDatos(ctx.userId, { nombre });
  await registrarAuditoria(ctx, {
    accion: "EDITAR_MI_CUENTA",
    entidad: "User",
    entidadId: ctx.userId,
    escuelaId: ctx.escuelaId,
  });
}

/**
 * Paso 1 del cambio de email propio: valida el correo nuevo y envía un código de
 * confirmación A ESE correo (prueba de posesión). El email NO cambia todavía: el
 * actual sigue siendo el válido hasta que el usuario confirme con el código.
 */
export async function solicitarCambioEmail(
  ctx: AuthContext,
  nuevoEmail: string,
): Promise<void> {
  const user = await obtenerUserSeguro(ctx.userId);
  if (!user) throw new ValidationError("Sesión inválida.");
  if (nuevoEmail === user.email) {
    throw new ValidationError("Ese ya es tu correo actual.");
  }
  if (await emailExisteGlobal(nuevoEmail)) {
    throw new ValidationError("Ese correo ya está en uso.");
  }

  const codigo = generarOtp();
  await invalidarTokensDe(ctx.userId, "CAMBIO_EMAIL");
  await crearTokenAuth({
    userId: ctx.userId,
    tipo: "CAMBIO_EMAIL",
    tokenHash: hashCodigoEmail(ctx.userId, codigo),
    emailNuevo: nuevoEmail,
    expiraEn: new Date(Date.now() + TTL_CAMBIO_EMAIL),
  });
  await enviarCodigoCambioEmail(nuevoEmail, codigo);
  await registrarAuditoria(ctx, {
    accion: "SOLICITAR_CAMBIO_EMAIL",
    entidad: "User",
    entidadId: ctx.userId,
    escuelaId: ctx.escuelaId,
  });
}

/**
 * Paso 2: confirma el código y aplica el email nuevo. Anti-fuerza-bruta con el
 * contador de intentos del token. Devuelve el email ya aplicado. Auditado.
 */
export async function confirmarCambioEmail(
  ctx: AuthContext,
  codigo: string,
): Promise<string> {
  const registro = await buscarTokenVigenteDe(ctx.userId, "CAMBIO_EMAIL");
  if (!registro || !registro.emailNuevo) {
    throw new ValidationError(
      "No hay un cambio de correo pendiente o ya venció. Pedí uno nuevo.",
    );
  }
  if (registro.intentos >= MAX_INTENTOS_CAMBIO_EMAIL) {
    throw new ValidationError("Demasiados intentos. Pedí un código nuevo.");
  }
  if (registro.tokenHash !== hashCodigoEmail(ctx.userId, codigo)) {
    await incrementarIntentos(registro.id);
    throw new ValidationError("Código incorrecto.");
  }

  // El correo pudo ocuparse entre la solicitud y la confirmación: revalidamos.
  if (await emailExisteGlobal(registro.emailNuevo)) {
    await marcarTokenUsado(registro.id);
    throw new ValidationError("Ese correo quedó en uso. Probá con otro.");
  }

  await actualizarEmailUser(ctx.userId, registro.emailNuevo);
  await marcarTokenUsado(registro.id);
  await registrarAuditoria(ctx, {
    accion: "CAMBIAR_EMAIL",
    entidad: "User",
    entidadId: ctx.userId,
    escuelaId: ctx.escuelaId,
  });
  return registro.emailNuevo;
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
