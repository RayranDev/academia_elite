import bcrypt from "bcryptjs";

// bcrypt factor 12 (Sección 6.1). Las contraseñas nunca se loguean ni devuelven.
const BCRYPT_ROUNDS = 12;

// Lista corta de contraseñas comunes (validación adicional a la longitud mínima).
const COMMON_PASSWORDS = new Set([
  "12345678",
  "password",
  "contraseña",
  "qwerty123",
  "11111111",
  "123456789",
  "futbol123",
  "admin123",
]);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function isCommonPassword(plain: string): boolean {
  return COMMON_PASSWORDS.has(plain.toLowerCase());
}
