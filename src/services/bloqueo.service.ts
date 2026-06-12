import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { obtenerJugadorParaFoto } from "@/repositories/jugador.repository";
import { actualizarBloqueoUsers } from "@/repositories/user.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { TIPOS_BLOQUEO, type TipoBloqueo } from "@/types";

/**
 * Bloqueo de acceso de la familia de un jugador. Solo ESCUELA_ADMIN (su
 * tenant) y SUPER_ADMIN. El DT solo lo ve. Acciones auditadas.
 */

async function cargarVinculos(ctx: AuthContext, jugadorId: string) {
  requireRole(ctx, ["ESCUELA_ADMIN", "SUPER_ADMIN"]);
  const jugador = await obtenerJugadorParaFoto(jugadorId);
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, jugador.escuelaId);
  const userIds = [
    ...new Set(
      [jugador.padreUserId, jugador.cuentaUserId].filter(
        (v): v is string => !!v,
      ),
    ),
  ];
  if (userIds.length === 0) {
    throw new ValidationError("Este jugador no tiene cuenta de familia vinculada.");
  }
  return { jugador, userIds };
}

export async function bloquearAccesoJugador(
  ctx: AuthContext,
  jugadorId: string,
  tipo: TipoBloqueo,
  mensaje?: string,
): Promise<void> {
  if (!TIPOS_BLOQUEO.includes(tipo)) throw new ValidationError("Motivo inválido.");
  if (tipo === "PERSONALIZADO" && !mensaje?.trim()) {
    throw new ValidationError("Escribe el mensaje personalizado.");
  }
  const { jugador, userIds } = await cargarVinculos(ctx, jugadorId);

  await actualizarBloqueoUsers(userIds, {
    bloqueado: true,
    bloqueoTipo: tipo,
    bloqueoMensaje: tipo === "PERSONALIZADO" ? mensaje!.trim() : null,
    bloqueadoEn: new Date(),
  });
  await registrarAuditoria(ctx, {
    accion: "BLOQUEAR_ACCESO",
    entidad: "Jugador",
    entidadId: jugadorId,
    escuelaId: jugador.escuelaId,
    motivo: tipo === "PERSONALIZADO" ? mensaje!.trim() : tipo,
  });
}

export async function desbloquearAccesoJugador(
  ctx: AuthContext,
  jugadorId: string,
): Promise<void> {
  const { jugador, userIds } = await cargarVinculos(ctx, jugadorId);

  await actualizarBloqueoUsers(userIds, {
    bloqueado: false,
    bloqueoTipo: null,
    bloqueoMensaje: null,
    bloqueadoEn: null,
  });
  await registrarAuditoria(ctx, {
    accion: "DESBLOQUEAR_ACCESO",
    entidad: "Jugador",
    entidadId: jugadorId,
    escuelaId: jugador.escuelaId,
  });
}
