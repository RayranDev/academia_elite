import { createHash } from "node:crypto";

/**
 * Huella corta de la contraseña vigente de un usuario. Se guarda en el JWT al
 * iniciar sesión y `getAuthContext` la compara con la actual: cualquier cambio de
 * contraseña (propio, recuperación, temporal asignada por la escuela) cambia el
 * hash y, con él, la huella, así que invalida todas las sesiones anteriores sin
 * una tabla de sesiones ni columnas nuevas.
 *
 * Es un SHA-256 truncado del hash bcrypt, nunca el hash: la cookie de sesión no
 * debe llevar nada con lo que se pueda atacar la contraseña. Solo Node (usa
 * `node:crypto`): no importar desde `config.ts`, que debe seguir siendo edge-safe.
 */
const LARGO_HUELLA = 16; // 64 bits: sobra para detectar un cambio, imposible de adivinar

export function huellaDePassword(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, LARGO_HUELLA);
}
