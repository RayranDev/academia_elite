"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { arancelSchema } from "@/lib/validators/arancel";
import {
  crearArancelEscuela,
  desactivarArancelEscuela,
} from "@/services/arancel.service";

export async function crearArancelAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = arancelSchema.safeParse({
      categoriaId: formData.get("categoriaId") ?? "",
      concepto: formData.get("concepto"),
      monto: formData.get("monto"),
      vigenteDesde: formData.get("vigenteDesde") ?? "",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await crearArancelEscuela(ctx, parsed.data);
    revalidatePath("/escuela/aranceles");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function desactivarArancelAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const id = formData.get("arancelId");
    if (typeof id !== "string" || id === "") {
      throw new ValidationError("Falta el precio a desactivar.");
    }
    await desactivarArancelEscuela(ctx, id);
    revalidatePath("/escuela/aranceles");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
