import { db } from "@/lib/db";

/**
 * Repositorio de tokens de autenticación por correo (Capa 4). TokenAuth no es un
 * modelo de tenant (no tiene escuelaId): es por usuario, así que estas queries
 * filtran por userId/tipo/hash, no por escuela.
 */

export type TipoTokenAuth =
  | "RECUPERACION"
  | "SET_PASSWORD"
  | "VERIFICACION_EMAIL"
  | "OTP";

export function crearTokenAuth(input: {
  userId: string;
  tipo: TipoTokenAuth;
  tokenHash: string;
  expiraEn: Date;
}) {
  return db.tokenAuth.create({ data: input });
}

/** Token vigente (no usado, no vencido) por su hash y tipo. */
export function buscarTokenVigente(tokenHash: string, tipo: TipoTokenAuth) {
  return db.tokenAuth.findFirst({
    where: { tokenHash, tipo, usadoEn: null, expiraEn: { gt: new Date() } },
  });
}

/**
 * Token vigente de un usuario por tipo (sin hash). Permite contar intentos
 * fallidos sobre el token aunque el código presentado no coincida.
 */
export function buscarTokenVigenteDe(userId: string, tipo: TipoTokenAuth) {
  return db.tokenAuth.findFirst({
    where: { userId, tipo, usadoEn: null, expiraEn: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export function marcarTokenUsado(id: string) {
  return db.tokenAuth.update({
    where: { id },
    data: { usadoEn: new Date() },
  });
}

export function incrementarIntentos(id: string) {
  return db.tokenAuth.update({
    where: { id },
    data: { intentos: { increment: 1 } },
  });
}

/** Invalida los tokens vigentes del mismo tipo antes de emitir uno nuevo. */
export function invalidarTokensDe(userId: string, tipo: TipoTokenAuth) {
  return db.tokenAuth.updateMany({
    where: { userId, tipo, usadoEn: null },
    data: { usadoEn: new Date() },
  });
}
