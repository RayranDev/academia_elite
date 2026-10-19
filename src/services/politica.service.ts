import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import { TERMINOS_VERSION } from "@/lib/legal";
import {
  obtenerAceptacionPolitica,
  sellarAceptacionPolitica,
} from "@/repositories/user.repository";
import { registrarAuditoria } from "@/services/audit.service";

export interface EstadoPoliticaDTO {
  /** true si el usuario ya aceptó la Política (en cualquier versión). */
  aceptada: boolean;
  version: string | null;
}

/**
 * Estado de aceptación de la Política del usuario. Lo lee de la base y NO del
 * JWT: el token no se refresca al aceptar, así que no serviría de compuerta.
 * Un usuario inexistente cuenta como "no aceptada" (el guard de sesión ya lo
 * habrá mandado a cerrar sesión antes de llegar acá).
 */
export async function obtenerEstadoPolitica(
  userId: string,
): Promise<EstadoPoliticaDTO> {
  const user = await obtenerAceptacionPolitica(userId);
  return {
    aceptada: user?.terminosAceptadosEn != null,
    version: user?.terminosVersion ?? null,
  };
}

/**
 * Primer ingreso de la familia con cuenta creada por el alta asistida: el
 * titular acepta en línea la Política y se sella fecha y versión vigente
 * (`TERMINOS_VERSION`). Solo rol JUGADOR (familia).
 *
 * Idempotente: si ya había aceptado no se toca la prueba original (ni se
 * duplica la auditoría). El sellado es un compare-and-set en el repositorio,
 * por lo que un doble envío concurrente tampoco la sobrescribe. El `userId`
 * sale SIEMPRE del contexto, nunca de un parámetro del cliente.
 */
export async function aceptarPolitica(ctx: AuthContext): Promise<void> {
  requireRole(ctx, ["JUGADOR"]);

  const { count } = await sellarAceptacionPolitica(ctx.userId, {
    terminosAceptadosEn: new Date(),
    terminosVersion: TERMINOS_VERSION,
  });
  if (count === 0) return;

  // El AuditLog no tiene campo de metadatos: la versión aceptada viaja en
  // `motivo` (sin datos personales extra).
  await registrarAuditoria(ctx, {
    accion: "POLITICA_ACEPTADA",
    entidad: "User",
    entidadId: ctx.userId,
    escuelaId: ctx.escuelaId,
    motivo: `Versión ${TERMINOS_VERSION}`,
  });
}
