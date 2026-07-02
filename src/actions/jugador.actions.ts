"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import {
  subirFoto,
  actualizarConsentimiento,
  actualizarAvatar,
} from "@/services/foto.service";
import { equiparFondo } from "@/services/fondo.service";
import { MAX_FOTO_BYTES } from "@/lib/foto/process";
import { avatarConfigSchema } from "@/lib/validators/avatar";

export async function subirFotoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`foto:${ctx.userId}`, 10, 24 * 60 * 60 * 1000);
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
      throw new ValidationError("La imagen supera los 4 MB.");
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

export async function actualizarAvatarAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const jugadorId = formData.get("jugadorId");
    if (typeof jugadorId !== "string" || !jugadorId) {
      throw new ValidationError("Jugador inválido.");
    }
    const parsed = avatarConfigSchema.safeParse({
      hair: formData.get("hair"),
      rearHair: formData.get("rearHair"),
      beard: formData.get("beard"),
      eyes: formData.get("eyes"),
      eyebrows: formData.get("eyebrows"),
      mouth: formData.get("mouth"),
      clothes: formData.get("clothes"),
      skinColor: formData.get("skinColor"),
      hairColor: formData.get("hairColor"),
      clothesColor: formData.get("clothesColor"),
    });
    if (!parsed.success) throw new ValidationError("Configuración inválida.");
    await actualizarAvatar(ctx, jugadorId, parsed.data);
    revalidatePath("/jugador");
    revalidatePath("/jugador/perfil");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function equiparFondoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const jugadorId = formData.get("jugadorId");
    if (typeof jugadorId !== "string" || !jugadorId) {
      throw new ValidationError("Jugador inválido.");
    }
    const fondoRaw = formData.get("fondoId");
    const fondoId = typeof fondoRaw === "string" && fondoRaw ? fondoRaw : null;
    await equiparFondo(ctx, jugadorId, fondoId);
    revalidatePath("/jugador");
    revalidatePath("/jugador/fondos");
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
