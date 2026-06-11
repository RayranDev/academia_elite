import type { AuthContext } from "@/lib/auth/context";
import type { TipoNotificacion } from "@/types";
import {
  crearNotificaciones,
  listarNotificaciones,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
} from "@/repositories/notificacion.repository";

export interface NotificacionDTO {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string | null;
  url: string | null;
  leida: boolean;
  createdAt: string;
}

/** Crea notificaciones in-app (uso interno del sistema; sin ctx). */
export async function notificar(
  userIds: string[],
  data: { tipo: TipoNotificacion; titulo: string; cuerpo?: string; url?: string },
): Promise<void> {
  const unicos = [...new Set(userIds.filter(Boolean))];
  await crearNotificaciones(
    unicos.map((userId) => ({
      userId,
      tipo: data.tipo,
      titulo: data.titulo,
      cuerpo: data.cuerpo ?? null,
      url: data.url ?? null,
    })),
  );
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
