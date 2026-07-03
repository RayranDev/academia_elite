import { ValidationError } from "@/lib/errors";
import {
  buscarUserPorEmail,
  obtenerUserSeguro,
  actualizarPasswordUser,
  marcarEmailVerificado,
} from "@/repositories/user.repository";
import {
  crearTokenAuth,
  buscarTokenVigenteDe,
  marcarTokenUsado,
  invalidarTokensDe,
  incrementarIntentos,
  type TipoTokenAuth,
} from "@/repositories/token-auth.repository";
import { crearAuditGlobal } from "@/repositories/audit.repository";
import { generarOtp, hashToken } from "@/lib/tokens";
import { hashPassword, isCommonPassword } from "@/lib/auth/password";
import {
  enviarRecuperacion,
  enviarSetPassword,
  enviarVerificacion,
} from "@/services/email.service";

/**
 * Flujos de auth por correo (Capa 3): recuperación, alta de cuenta
 * (set-password) y verificación de email. Todos usan CÓDIGO OTP de 6 dígitos, no
 * enlaces: un código hay que tipearlo de vuelta en el flujo, así un correo
 * equivocado no deja un botón clickeable que tome control de la cuenta (dato
 * sensible: son familias de menores).
 */

type TipoCodigo = "RECUPERACION" | "SET_PASSWORD" | "VERIFICACION_EMAIL";

const TTL: Record<TipoCodigo, number> = {
  RECUPERACION: 30 * 60 * 1000, // 30 min
  SET_PASSWORD: 24 * 60 * 60 * 1000, // 24 h
  VERIFICACION_EMAIL: 48 * 60 * 60 * 1000, // 48 h
};

// Intentos fallidos por código antes de invalidarlo de facto (anti-fuerza-bruta,
// persistido en el token; la primera barrera es el rate limit de la acción).
const MAX_INTENTOS = 5;

// El hash incluye el userId para que el tokenHash (@unique) no colisione entre
// usuarios que reciban el mismo código de 6 dígitos.
function hashCodigo(userId: string, codigo: string): string {
  return hashToken(`${userId}:${codigo}`);
}

/** Emite un código (invalidando los previos del mismo tipo). Devuelve el código. */
async function emitirCodigo(userId: string, tipo: TipoCodigo): Promise<string> {
  await invalidarTokensDe(userId, tipo);
  const codigo = generarOtp();
  await crearTokenAuth({
    userId,
    tipo,
    tokenHash: hashCodigo(userId, codigo),
    expiraEn: new Date(Date.now() + TTL[tipo]),
  });
  return codigo;
}

/**
 * "Olvidé mi contraseña". NO revela si el correo existe (anti-enumeración):
 * el llamador siempre responde con un mensaje genérico.
 */
export async function solicitarRecuperacion(email: string): Promise<void> {
  const user = await buscarUserPorEmail(email);
  if (!user || !user.activo) return;
  const codigo = await emitirCodigo(user.id, "RECUPERACION");
  await enviarRecuperacion(user.email, codigo);
}

/**
 * Alta de cuenta: envía un código para que el responsable fije su contraseña,
 * más un enlace de comodidad a la página de activación con el correo precargado
 * (el código lo tipea el usuario). Silencioso si el usuario no existe.
 */
export async function emitirSetPassword(
  email: string,
  urlBase: string,
): Promise<void> {
  const user = await buscarUserPorEmail(email);
  if (!user) return;
  const codigo = await emitirCodigo(user.id, "SET_PASSWORD");
  const url = `${urlBase}/recuperar?paso=codigo&email=${encodeURIComponent(
    user.email,
  )}`;
  await enviarSetPassword(user.email, user.nombre, codigo, url);
}

/**
 * Registro: envía un código para verificar la dirección. Silencioso si el
 * usuario no existe o ya está verificado.
 */
export async function emitirVerificacion(email: string): Promise<void> {
  const user = await buscarUserPorEmail(email);
  if (!user || user.emailVerificado) return;
  const codigo = await emitirCodigo(user.id, "VERIFICACION_EMAIL");
  await enviarVerificacion(user.email, user.nombre, codigo);
}

/** ¿El usuario tiene el correo verificado? (aviso suave del panel). */
export async function emailVerificadoDe(userId: string): Promise<boolean> {
  const user = await obtenerUserSeguro(userId);
  // Si no se puede leer, no molestamos con el aviso.
  return user?.emailVerificado ?? true;
}

/** Reenvía el código de verificación al usuario logueado (si falta verificar). */
export async function reenviarVerificacion(userId: string): Promise<void> {
  const user = await obtenerUserSeguro(userId);
  if (!user || user.emailVerificado) return;
  await emitirVerificacion(user.email);
}

/**
 * Confirma el correo del usuario LOGUEADO con su código. Lanza ValidationError
 * si el código es incorrecto o venció (contando intentos). Auditado.
 */
export async function verificarMiEmailConCodigo(
  userId: string,
  codigo: string,
): Promise<void> {
  const registro = await buscarTokenVigenteDe(userId, "VERIFICACION_EMAIL");
  if (!registro || registro.intentos >= MAX_INTENTOS) {
    throw new ValidationError(
      "El código no es válido o venció. Pedí uno nuevo.",
    );
  }
  if (registro.tokenHash !== hashCodigo(userId, codigo)) {
    await incrementarIntentos(registro.id);
    throw new ValidationError("Código incorrecto.");
  }
  const user = await obtenerUserSeguro(userId);
  if (!user) throw new ValidationError("Sesión inválida.");

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
}

/**
 * Fija una contraseña nueva validando el CÓDIGO (recuperación o alta de cuenta).
 * Como el usuario probó acceso al correo (recibió el código), el email queda
 * verificado. Anti-fuerza-bruta por intentos del token. Auditado.
 */
export async function fijarPasswordConCodigo(
  email: string,
  codigo: string,
  nueva: string,
): Promise<void> {
  if (isCommonPassword(nueva)) {
    throw new ValidationError("Esa contraseña es demasiado común, elige otra.");
  }

  const user = await buscarUserPorEmail(email);
  // Mensaje genérico e idéntico en todos los caminos: no revela si el correo
  // existe ni por qué falla (anti-enumeración / anti-fuerza-bruta).
  const invalido = new ValidationError(
    "El código no es válido o venció. Pedí uno nuevo.",
  );
  if (!user || !user.activo) throw invalido;

  const hash = hashCodigo(user.id, codigo);
  const tipos: TipoTokenAuth[] = ["SET_PASSWORD", "RECUPERACION"];
  let registro: Awaited<ReturnType<typeof buscarTokenVigenteDe>> = null;
  for (const tipo of tipos) {
    const reg = await buscarTokenVigenteDe(user.id, tipo);
    if (!reg || reg.intentos >= MAX_INTENTOS) continue;
    if (reg.tokenHash === hash) {
      registro = reg;
      break;
    }
    await incrementarIntentos(reg.id);
  }
  if (!registro) throw invalido;

  await actualizarPasswordUser(user.id, await hashPassword(nueva));
  await marcarTokenUsado(registro.id);
  // El usuario probó acceso a su correo al recibir el código → email verificado.
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
