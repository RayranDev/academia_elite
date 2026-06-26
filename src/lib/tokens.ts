import { createHash, randomBytes } from "node:crypto";

/**
 * Tokens de un solo uso para flujos de correo. Regla de oro: en la BD se guarda
 * solo el HASH (SHA-256) del token; el texto plano viaja únicamente en el correo.
 * Así, una filtración de la tabla no permite usar los tokens.
 */

/** Token opaco para enlaces (recuperación / set-password / verificación). */
export function generarToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Código numérico de 6 dígitos para OTP (fácil de tipear). */
export function generarOtp(): string {
  // 0–999999 con padding; randomInt evita sesgo de módulo.
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

/** Hash determinista para guardar/buscar el token sin exponer el texto. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
