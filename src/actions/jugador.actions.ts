"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { subirFoto, actualizarConsentimiento } from "@/services/foto.service";
import { MAX_FOTO_BYTES } from "@/lib/foto/process";

export async function subirFotoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limite = rateLimit(`foto:${ctx.userId}`, 10, 24 * 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiadas subidas hoy.");

    const jugadorId = formData.get("jugadorId");
    const file = formData.get("foto");
    if (typeof jugadorId !== "string" || !jugadorId) {
      throw new ValidationError("Jugador inválido.");
    }
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("Selecciona una imagen.");
    }
    if (file.size > MAX_FOTO_BYTES) {
      throw new ValidationError("La imagen supera los 5 MB.");
    }
    const buf = Buffer.from(await file.arrayBuffer());
    await subirFoto(ctx, jugadorId, buf);
    revalidatePath("/jugador");
    revalidatePath("/jugador/perfil");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function actualizarConsentimientoAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuthContext();
  const jugadorId = formData.get("jugadorId");
  const consiente = formData.get("consiente") === "true";
  if (typeof jugadorId !== "string" || !jugadorId) {
    throw new ValidationError("Jugador inválido.");
  }
  await actualizarConsentimiento(ctx, jugadorId, consiente);
  revalidatePath("/jugador");
  revalidatePath("/jugador/perfil");
}
