"use server";

import { requireAuthContext } from "@/lib/auth/session";
import {
  marcarNotificacionLeida,
  marcarTodasMisLeidas,
} from "@/services/notificacion.service";

/** Marca una notificación como leída (del usuario en sesión). */
export async function marcarLeidaAction(id: string): Promise<void> {
  if (!id) return;
  const ctx = await requireAuthContext();
  await marcarNotificacionLeida(ctx, id);
}

/** Marca todas las notificaciones del usuario en sesión como leídas. */
export async function marcarTodasLeidasAction(): Promise<void> {
  const ctx = await requireAuthContext();
  await marcarTodasMisLeidas(ctx);
}
