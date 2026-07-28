import type { AuthContext } from "@/lib/auth/context";
import type { TipoNotificacion, Prioridad } from "@/types";
import {
  registrarCanal,
  despachar,
  type MensajeNotificacion,
} from "@/lib/notify/dispatcher";
import {
  crearNotificaciones,
  listarNotificaciones,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  borrarLeidasAntiguas,
} from "@/repositories/notificacion.repository";

// Retención de notificaciones ya leídas: pasado este tiempo se borran para que
// no se acumulen sesión tras sesión (decisión del usuario, 2026-07-26).
const RETENCION_LEIDAS_DIAS = 7;

// Canal INAPP del despachador (G9): persiste en la tabla Notificacion.
registrarCanal({
  canal: "INAPP",
  async enviar(userIds: string[], mensaje: MensajeNotificacion) {
    await crearNotificaciones(
      userIds.map((userId) => ({
        userId,
        tipo: mensaje.tipo,
        titulo: mensaje.titulo,
        cuerpo: mensaje.cuerpo ?? null,
        url: mensaje.url ?? null,
        prioridad: mensaje.prioridad ?? "media",
      })),
    );
  },
});

export interface NotificacionDTO {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string | null;
  url: string | null;
  prioridad: string;
  leida: boolean;
  createdAt: string;
}

/**
 * Crea notificaciones (uso interno del sistema; sin ctx). Pasa por el
 * despachador (G9): hoy solo INAPP; EMAIL/WHATSAPP se suman en Fase 2.
 */
export async function notificar(
  userIds: string[],
  data: {
    tipo: TipoNotificacion;
    titulo: string;
    cuerpo?: string;
    url?: string;
    prioridad?: Prioridad;
  },
): Promise<void> {
  await despachar(userIds, data, ["INAPP", "EMAIL", "WHATSAPP"]);
}

export async function listarMisNotificaciones(
  ctx: AuthContext,
): Promise<NotificacionDTO[]> {
  const rows = await listarNotificaciones(ctx.userId);
  return rows.map((n) => ({
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    url: n.url,
    prioridad: n.prioridad,
    leida: n.leida,
    createdAt: n.createdAt.toISOString(),
  }));
}

export function contarMisNoLeidas(ctx: AuthContext): Promise<number> {
  return contarNoLeidas(ctx.userId);
}

export async function marcarNotificacionLeida(
  ctx: AuthContext,
  id: string,
): Promise<void> {
  await marcarLeida(ctx.userId, id);
}

export async function marcarTodasMisLeidas(ctx: AuthContext): Promise<void> {
  await marcarTodasLeidas(ctx.userId);
}

/** Cron diario (sin ctx): borra notificaciones leídas con más de N días. */
export async function limpiarNotificacionesLeidas(): Promise<{ count: number }> {
  const antesDe = new Date(Date.now() - RETENCION_LEIDAS_DIAS * 24 * 60 * 60 * 1000);
  return borrarLeidasAntiguas(antesDe);
}
