"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { editarRangosCategoriaSchema } from "@/lib/validators/categoria-rango";
import { editarRangosCategoriaEscuela } from "@/services/categoria-rango.service";

export async function editarRangosCategoriaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = editarRangosCategoriaSchema.safeParse({
      categoriaId: formData.get("categoriaId"),
      sprintMin: formData.get("sprintMin"),
      sprintMax: formData.get("sprintMax"),
      saltoMin: formData.get("saltoMin"),
      saltoMax: formData.get("saltoMax"),
      agilidadMin: formData.get("agilidadMin"),
      agilidadMax: formData.get("agilidadMax"),
      yoyoMin: formData.get("yoyoMin"),
      yoyoMax: formData.get("yoyoMax"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarRangosCategoriaEscuela(ctx, parsed.data);
    revalidatePath("/escuela/categorias");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
