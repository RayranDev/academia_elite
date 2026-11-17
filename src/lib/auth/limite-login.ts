import { CredentialsSignin } from "next-auth";
import { ipCliente } from "@/lib/ip-cliente";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Límite de intentos de credenciales (única fuente de verdad).
 *
 * Vive dentro de los `authorize` de `src/auth.ts` y NO en las Server Actions:
 * el handler `/api/auth/callback/*` también valida credenciales y el proxy
 * excluye `/api`, así que cualquier tope puesto solo en la action se esquiva
 * pidiendo un token CSRF y llamando al endpoint directo. Acá se aplica sin
 * importar por qué puerta se entre, y la action solo traduce el error al mensaje
 * que ya veía el usuario (sin contar el intento dos veces).
 *
 * Dos topes por intento, ambos ANTES de tocar la base o bcrypt y sobre el correo
 * tal como llegó (exista o no la cuenta), así la respuesta no revela cuentas:
 *  1. Por IP + correo: frena el goteo desde un mismo origen.
 *  2. Por correo solo: frena al atacante que rota IPs para repartir los intentos.
 */

/** Código que viaja en `?code=` si el endpoint de Auth.js corta por límite. */
export const CODIGO_LIMITE_INTENTOS = "demasiados_intentos";

/**
 * Se lanza desde `authorize` al superar un tope. Hereda de `CredentialsSignin`
 * para que Auth.js lo trate como un fallo de login más (redirige a /login con
 * `error=CredentialsSignin`) y la action pueda reconocerlo por su `code`.
 */
export class LimiteIntentosError extends CredentialsSignin {
  code = CODIGO_LIMITE_INTENTOS;
}

export function esLimiteDeIntentos(error: unknown): boolean {
  return error instanceof CredentialsSignin && error.code === CODIGO_LIMITE_INTENTOS;
}

/**
 * Tope por correo, sin IP: 20 intentos cada 15 minutos (≈1.900 por día).
 * Suficiente para que la fuerza bruta no avance con contraseñas que además deben
 * pasar el filtro de comunes, y holgado para una persona real (que ya está
 * limitada a 5 por minuto desde su IP).
 *
 * Compromiso aceptado: como todo tope por cuenta, permite a un tercero que
 * conozca el correo dejarlo sin acceso por contraseña. Con ~1,3 intentos por
 * minuto desde una sola IP mantiene el cupo lleno de forma indefinida; el
 * bloqueo dura mientras él siga y termina cuando para (la ventana es deslizante,
 * no hay nada que levantar a mano). La alternativa, sin tope por correo, sería
 * permitir adivinar sin límite rotando de IP. El ingreso con código por correo
 * tiene su propio contador (`otp-login-correo`), de modo que sigue disponible
 * mientras el atacante no gaste también ese.
 */
const MAX_INTENTOS_POR_CORREO = 20;
const VENTANA_POR_CORREO_MS = 15 * 60_000;

export interface CanalDeLogin {
  /** Prefijo de las claves de rate limit; cada canal cuenta por separado. */
  prefijo: string;
  maxPorIp: number;
  ventanaPorIpMs: number;
}

/** Contraseña: 5 por minuto por IP+correo (el mismo tope que tenía la action). */
export const CANAL_PASSWORD: CanalDeLogin = {
  prefijo: "login",
  maxPorIp: 5,
  ventanaPorIpMs: 60_000,
};

/** Código OTP: 5 cada 15 minutos por IP+correo (el mismo tope que tenía la action). */
export const CANAL_OTP: CanalDeLogin = {
  prefijo: "otp-login",
  maxPorIp: 5,
  ventanaPorIpMs: 15 * 60_000,
};

/**
 * Cuenta un intento de login y lanza `LimiteIntentosError` si algún tope se
 * superó. `request` es el `Request` que Auth.js le pasa a `authorize`.
 */
export async function exigirCupoDeLogin(
  request: { headers: { get(name: string): string | null } },
  canal: CanalDeLogin,
  email: string,
): Promise<void> {
  const ip = ipCliente(request.headers);
  const porIp = await rateLimit(
    `${canal.prefijo}:${ip}:${email}`,
    canal.maxPorIp,
    canal.ventanaPorIpMs,
  );
  if (!porIp.ok) throw new LimiteIntentosError();

  const porCorreo = await rateLimit(
    `${canal.prefijo}-correo:${email}`,
    MAX_INTENTOS_POR_CORREO,
    VENTANA_POR_CORREO_MS,
  );
  if (!porCorreo.ok) throw new LimiteIntentosError();
}
