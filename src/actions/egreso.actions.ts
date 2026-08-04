"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { egresoSchema } from "@/lib/validators/egreso";
import { registrarEgreso, eliminarEgreso } from "@/services/egreso.service";

export async function registrarEgresoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = egresoSchema.safeParse({
      concepto: formData.get("concepto"),
      monto: formData.get("monto"),
      fecha: formData.get("fecha"),
      descripcion: formData.get("descripcion") ?? "",
      medioPago: formData.get("medioPago") ?? "",
      referenciaPago: formData.get("referenciaPago") ?? "",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await registrarEgreso(ctx, parsed.data);
    revalidatePath("/escuela/egresos");
    // El dashboard también muestra egresos y caja neta del mes.
    revalidatePath("/escuela");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function eliminarEgresoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const id = formData.get("id");
    if (typeof id !== "string" || !id) {
      throw new ValidationError("Egreso inválido.");
    }
    await eliminarEgreso(ctx, id);
    revalidatePath("/escuela/egresos");
    revalidatePath("/escuela");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
