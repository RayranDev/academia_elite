"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  iniciarSoporteSchema,
  habilitarEscrituraSchema,
} from "@/lib/validators/soporte";
import {
  iniciarSoporte,
  finalizarSoporte,
  habilitarEscrituraSoporte,
} from "@/services/soporte.service";

// Server Actions del modo soporte (M2). Frontera: sesión + Zod; la autorización
// real (requireRole SUPER_ADMIN) vive en el servicio.

export async function iniciarSoporteAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = iniciarSoporteSchema.safeParse({
      escuelaId: formData.get("escuelaId"),
      motivo: formData.get("motivo"),
      soloLectura: formData.get("soloLectura") === "on",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await iniciarSoporte(ctx, parsed.data);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function finalizarSoporteAction(
  _prev: ActionResult | undefined,
  _formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    await finalizarSoporte(ctx);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function habilitarEscrituraSoporteAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = habilitarEscrituraSchema.safeParse({
      motivo: formData.get("motivo"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await habilitarEscrituraSoporte(ctx, parsed.data.motivo);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
