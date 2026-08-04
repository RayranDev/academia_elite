import type { AuthContext } from "@/lib/auth/context";
import {
  requireRole,
  assertTenant,
  assertMotivoSoporte,
  assertSoportePuedeEscribir,
} from "@/lib/auth/guards";
import { DomainError, NotFoundError, ValidationError } from "@/lib/errors";
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
  const jugador = await obtenerJugadorParaFoto(ctx.escuelaId, jugadorId);
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
  // Nota: no usa assertMotivoSoporte como las demás escrituras del SA porque el
  // tipo/mensaje del bloqueo ya es la justificación obligatoria que va al AuditLog.
  assertSoportePuedeEscribir(ctx);
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

export interface ResultadoBloqueoMasivo {
  bloqueados: number;
  fallidos: { jugadorId: string; motivo: string }[];
}

/**
 * Bloqueo en lote (panel de morosos). Secuencial y no `Promise.all`: un
 * jugador sin cuenta de familia vinculada (u otro fallo puntual) no debe
 * abortar el resto del lote, así que cada intento se reporta aparte. Cada
 * llamada a `bloquearAccesoJugador` ya audita su propio bloqueo — no hay
 * auditoría extra por el lote entero, cada bloqueo queda trazable por separado.
 */
export async function bloquearAccesoJugadores(
  ctx: AuthContext,
  jugadorIds: string[],
  tipo: TipoBloqueo,
  mensaje?: string,
): Promise<ResultadoBloqueoMasivo> {
  const fallidos: { jugadorId: string; motivo: string }[] = [];
  let bloqueados = 0;
  for (const jugadorId of jugadorIds) {
    try {
      await bloquearAccesoJugador(ctx, jugadorId, tipo, mensaje);
      bloqueados++;
    } catch (e) {
      fallidos.push({
        jugadorId,
        motivo: e instanceof DomainError ? e.message : "Error inesperado",
      });
    }
  }
  return { bloqueados, fallidos };
}

export async function desbloquearAccesoJugador(
  ctx: AuthContext,
  jugadorId: string,
  motivo?: string,
): Promise<void> {
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);
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
    motivo,
  });
}
