"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { landingSchema } from "@/lib/validators/landing";
import { actualizarLandingEscuela } from "@/services/landing.service";

function primerError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Datos inválidos.";
}

/** Guarda la landing pública del panel (`/escuela/branding`) y revalida su preview. */
export async function actualizarLandingAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = landingSchema.safeParse({
      publicada: formData.get("publicada") === "on",
      titular: formData.get("titular") ?? undefined,
      descripcion: formData.get("descripcion") ?? undefined,
      heroId: formData.get("heroId") ?? undefined,
      whatsapp: formData.get("whatsapp") ?? undefined,
      email: formData.get("email") ?? undefined,
      instagram: formData.get("instagram") ?? undefined,
    });
    if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));

    const { slug } = await actualizarLandingEscuela(ctx, parsed.data);

    revalidatePath("/escuela/branding");
    revalidatePath(`/e/${slug}`);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
