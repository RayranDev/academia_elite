"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import {
  marcarNotificacionLeida,
  marcarTodasMisLeidas,
} from "@/services/notificacion.service";

/** Marca una notificación como leída (del usuario en sesión). */
export async function marcarLeidaAction(id: string): Promise<ActionResult> {
  try {
    if (!id) return { ok: true };
    const ctx = await requireAuthContext();
    await marcarNotificacionLeida(ctx, id);
    // La campana vive en el layout de cada panel: se invalida el layout entero
    // para que el contador y la lista lleguen frescos al navegar entre secciones.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Marca todas las notificaciones del usuario en sesión como leídas. */
export async function marcarTodasLeidasAction(): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    await marcarTodasMisLeidas(ctx);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
