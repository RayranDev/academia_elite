"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { progresoSemanaSchema, progresoDtSchema } from "@/lib/validators/progreso";
import { validarSemanaActual, validarSemanaDt } from "@/services/progreso.service";

export async function validarSemanaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limite = rateLimit(`progreso:${ctx.userId}`, 10, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiados intentos. Espera un momento.");

    const parsed = progresoSemanaSchema.safeParse({
      jugadorId: formData.get("jugadorId"),
      academico: formData.get("academico") === "on",
      comportamiento: formData.get("comportamiento") === "on",
      puntualidad: formData.get("puntualidad") === "on",
      ayudaCasa: formData.get("ayudaCasa") === "on",
      valores: formData.get("valores") === "on",
      nota: formData.get("nota")?.toString() ?? undefined,
    });
    if (!parsed.success) throw new ValidationError("Datos inválidos.");

    await validarSemanaActual(ctx, parsed.data);
    revalidatePath("/jugador/progreso");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function validarSemanaDtAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult<{ validados: number; omitidos: number }>> {
  try {
    const ctx = await requireAuthContext();
    const limite = rateLimit(`progreso-dt:${ctx.userId}`, 20, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiados intentos. Espera un momento.");

    let entradas: unknown;
    try {
      entradas = JSON.parse(formData.get("entradas")?.toString() ?? "[]");
    } catch {
      throw new ValidationError("Datos inválidos.");
    }
    const parsed = progresoDtSchema.safeParse({ entradas });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }

    const res = await validarSemanaDt(ctx, parsed.data);
    revalidatePath("/dt/progreso");
    return { ok: true, data: res };
  } catch (e) {
    return mapError(e);
  }
}
