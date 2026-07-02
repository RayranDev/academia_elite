import { buscarUserPorEmail } from "@/repositories/user.repository";
import {
  crearTokenAuth,
  buscarTokenVigenteDe,
  marcarTokenUsado,
  invalidarTokensDe,
  incrementarIntentos,
} from "@/repositories/token-auth.repository";
import { generarOtp, hashToken } from "@/lib/tokens";
import { enviarOtp } from "@/services/email.service";

/**
 * Login con código de un solo uso (OTP) por correo (Capa 3).
 *
 * El `tokenHash` es @unique, así que el hash incluye el userId: dos usuarios
 * pueden recibir el mismo código de 6 dígitos sin colisionar. El lookup pasa
 * siempre por email → usuario, y luego por hash(userId:codigo).
 */

const TTL_OTP = 10 * 60 * 1000; // 10 min
// Intentos fallidos permitidos por código antes de invalidarlo de facto.
// Segunda barrera anti-fuerza-bruta, persistida en DB (la primera es el rate
// limit distribuido en la acción).
const MAX_INTENTOS_OTP = 5;

function hashOtp(userId: string, codigo: string): string {
  return hashToken(`${userId}:${codigo}`);
}

/**
 * Genera y envía un OTP. NO revela si el correo existe (anti-enumeración): el
 * llamador responde siempre genérico.
 */
export async function solicitarOtp(email: string): Promise<void> {
  const user = await buscarUserPorEmail(email);
  if (!user || !user.activo) return;

  const codigo = generarOtp();
  await invalidarTokensDe(user.id, "OTP");
  await crearTokenAuth({
    userId: user.id,
    tipo: "OTP",
    tokenHash: hashOtp(user.id, codigo),
    expiraEn: new Date(Date.now() + TTL_OTP),
  });
  await enviarOtp(user.email, codigo);
}

/** Rol del usuario por su email (para resolver el panel destino tras el login). */
export async function rolPorEmail(email: string): Promise<string | null> {
  const user = await buscarUserPorEmail(email);
  return user?.rol ?? null;
}

export interface UsuarioOtp {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  escuelaId: string | null;
}

/**
 * Valida un OTP. Devuelve el usuario si el código es correcto y vigente (y lo
 * marca usado), o null. Anti-fuerza-bruta en dos capas: rate limit en la acción
 * que llama a `signIn` + contador de intentos persistido en el token — al
 * agotar `MAX_INTENTOS_OTP` el código deja de aceptarse aunque sea correcto.
 */
export async function verificarOtp(
  email: string,
  codigo: string,
): Promise<UsuarioOtp | null> {
  const user = await buscarUserPorEmail(email);
  if (!user || !user.activo) return null;

  // Lookup por usuario (no por hash): así los códigos erróneos también
  // cuentan intentos contra el token vigente.
  const registro = await buscarTokenVigenteDe(user.id, "OTP");
  if (!registro) return null;
  if (registro.intentos >= MAX_INTENTOS_OTP) return null;

  if (registro.tokenHash !== hashOtp(user.id, codigo)) {
    await incrementarIntentos(registro.id);
    return null;
  }

  await marcarTokenUsado(registro.id);
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    escuelaId: user.escuelaId,
  };
}
