"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  membresiaSchema,
  cambiarEstadoMembresiaSchema,
} from "@/lib/validators/membresia";
import {
  registrarMembresiaEscuela,
  cambiarEstadoMembresiaEscuela,
} from "@/services/membresia.service";

export async function registrarMembresiaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = membresiaSchema.safeParse({
      jugadorId: formData.get("jugadorId"),
      periodo: formData.get("periodo"),
      monto: formData.get("monto") ?? "",
      estado: formData.get("estado"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await registrarMembresiaEscuela(ctx, parsed.data);
    revalidatePath("/escuela/membresias");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function cambiarEstadoMembresiaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = cambiarEstadoMembresiaSchema.safeParse({
      membresiaId: formData.get("membresiaId"),
      estado: formData.get("estado"),
    });
    if (!parsed.success) throw new ValidationError("Datos inválidos.");
    await cambiarEstadoMembresiaEscuela(ctx, parsed.data.membresiaId, parsed.data.estado);
    revalidatePath("/escuela/membresias");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
