import { ValidationError } from "@/lib/errors";
import {
  buscarUserPorEmail,
  obtenerUserSeguro,
  actualizarPasswordUser,
  marcarEmailVerificado,
} from "@/repositories/user.repository";
import {
  crearTokenAuth,
  buscarTokenVigente,
  marcarTokenUsado,
  invalidarTokensDe,
  type TipoTokenAuth,
} from "@/repositories/token-auth.repository";
import { crearAuditGlobal } from "@/repositories/audit.repository";
import { generarToken, hashToken } from "@/lib/tokens";
import { hashPassword, isCommonPassword } from "@/lib/auth/password";
import {
  enviarRecuperacion,
  enviarSetPassword,
  enviarVerificacion,
} from "@/services/email.service";

/**
 * Flujos de auth por correo (Capa 3): recuperación, alta de cuenta
 * (set-password) y verificación de email. Comparten la misma máquina de tokens
 * de un solo uso.
 */

type TipoEnlace = "RECUPERACION" | "SET_PASSWORD" | "VERIFICACION_EMAIL";

const TTL: Record<TipoEnlace, number> = {
  RECUPERACION: 30 * 60 * 1000, // 30 min
  SET_PASSWORD: 24 * 60 * 60 * 1000, // 24 h
  VERIFICACION_EMAIL: 48 * 60 * 60 * 1000, // 48 h
};

/** Emite un token de enlace (invalidando los previos del mismo tipo). */
async function emitirEnlace(
  userId: string,
  tipo: TipoEnlace,
): Promise<string> {
  await invalidarTokensDe(userId, tipo);
  const token = generarToken();
  await crearTokenAuth({
    userId,
    tipo,
    tokenHash: hashToken(token),
    expiraEn: new Date(Date.now() + TTL[tipo]),
  });
  return token;
}

/**
 * "Olvidé mi contraseña". NO revela si el correo existe (anti-enumeración):
 * el llamador siempre responde con un mensaje genérico.
 */
export async function solicitarRecuperacion(
  email: string,
  urlBase: string,
): Promise<void> {
  const user = await buscarUserPorEmail(email);
  if (!user || !user.activo) return;
  const token = await emitirEnlace(user.id, "RECUPERACION");
  await enviarRecuperacion(user.email, `${urlBase}/recuperar/${token}`);
}

/**
 * Alta de cuenta: envía un link para que el responsable fije su contraseña.
 * No revela nada al llamador (silencioso si el usuario no existe).
 */
export async function emitirSetPassword(
  email: string,
  urlBase: string,
): Promise<void> {
  const user = await buscarUserPorEmail(email);
  if (!user) return;
  const token = await emitirEnlace(user.id, "SET_PASSWORD");
  await enviarSetPassword(user.email, user.nombre, `${urlBase}/recuperar/${token}`);
}

/**
 * Registro: envía un correo para verificar la dirección. Silencioso si el
 * usuario no existe o ya está verificado.
 */
export async function emitirVerificacion(
  email: string,
  urlBase: string,
): Promise<void> {
  const user = await buscarUserPorEmail(email);
  if (!user || user.emailVerificado) return;
  const token = await emitirEnlace(user.id, "VERIFICACION_EMAIL");
  await enviarVerificacion(
    user.email,
    user.nombre,
    `${urlBase}/verificar/${token}`,
  );
}

/** ¿El usuario tiene el correo verificado? (aviso suave del panel). */
export async function emailVerificadoDe(userId: string): Promise<boolean> {
  const user = await obtenerUserSeguro(userId);
  // Si no se puede leer, no molestamos con el aviso.
  return user?.emailVerificado ?? true;
}

/** Reenvía el correo de verificación al usuario logueado (si falta verificar). */
export async function reenviarVerificacion(
  userId: string,
  urlBase: string,
): Promise<void> {
  const user = await obtenerUserSeguro(userId);
  if (!user || user.emailVerificado) return;
  await emitirVerificacion(user.email, urlBase);
}

/**
 * Confirma el correo a partir del token de verificación. Devuelve true si lo
 * verificó (o ya estaba), false si el enlace no sirve. No lanza para que la
 * página pueda mostrar un estado amable.
 */
export async function verificarEmailConToken(token: string): Promise<boolean> {
  const registro = await buscarTokenVigente(
    hashToken(token),
    "VERIFICACION_EMAIL",
  );
  if (!registro) return false;
  const user = await obtenerUserSeguro(registro.userId);
  if (!user) return false;
  await marcarEmailVerificado(user.id);
  await marcarTokenUsado(registro.id);
  await crearAuditGlobal({
    actorId: user.id,
    actorRol: user.rol,
    accion: "VERIFICAR_EMAIL",
    entidad: "User",
    entidadId: user.id,
    escuelaId: user.escuelaId,
  });
  return true;
}

/**
 * Fija una contraseña nueva validando el token del enlace. Acepta tanto
 * recuperación como set-password. Marca el token usado y, como el usuario probó
 * acceso al correo, deja el email como verificado. Auditado (sin sesión: el
 * actor es el propio usuario).
 */
export async function fijarPasswordConToken(
  token: string,
  nueva: string,
): Promise<void> {
  if (isCommonPassword(nueva)) {
    throw new ValidationError("Esa contraseña es demasiado común, elige otra.");
  }

  const hash = hashToken(token);
  const tipos: TipoTokenAuth[] = ["RECUPERACION", "SET_PASSWORD"];
  let registro: Awaited<ReturnType<typeof buscarTokenVigente>> = null;
  for (const tipo of tipos) {
    registro = await buscarTokenVigente(hash, tipo);
    if (registro) break;
  }
  if (!registro) {
    throw new ValidationError(
      "El enlace no es válido o ya venció. Pedí uno nuevo.",
    );
  }

  const user = await obtenerUserSeguro(registro.userId);
  if (!user || !user.activo) {
    throw new ValidationError("La cuenta no está disponible.");
  }

  await actualizarPasswordUser(user.id, await hashPassword(nueva));
  await marcarTokenUsado(registro.id);
  // El usuario probó acceso a su correo al abrir el enlace → email verificado.
  await marcarEmailVerificado(user.id);
  await crearAuditGlobal({
    actorId: user.id,
    actorRol: user.rol,
    accion: "FIJAR_PASSWORD",
    entidad: "User",
    entidadId: user.id,
    escuelaId: user.escuelaId,
  });
}
