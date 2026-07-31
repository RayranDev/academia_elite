"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  membresiaSchema,
  cambiarEstadoMembresiaSchema,
  generarCuotasSchema,
} from "@/lib/validators/membresia";
import {
  registrarMembresiaEscuela,
  cambiarEstadoMembresiaEscuela,
  generarCuotasDelPeriodo,
  type GeneracionCuotasDTO,
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
      concepto: formData.get("concepto") ?? "MENSUALIDAD",
      monto: formData.get("monto") ?? "",
      descuento: formData.get("descuento") ?? "",
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

/**
 * Genera la cobranza del período de un click. Devuelve el resumen para que la
 * pantalla diga exactamente qué pasó ("137 creadas, 13 ya existían") en vez de
 * un "listo" opaco sobre una operación que toca cientos de filas.
 */
export async function generarCuotasAction(
  _prev: ActionResult<GeneracionCuotasDTO> | undefined,
  formData: FormData,
): Promise<ActionResult<GeneracionCuotasDTO>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = generarCuotasSchema.safeParse({
      periodo: formData.get("periodo"),
      concepto: formData.get("concepto") ?? "MENSUALIDAD",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const data = await generarCuotasDelPeriodo(
      ctx,
      parsed.data.periodo,
      parsed.data.concepto,
    );
    revalidatePath("/escuela/membresias");
    return { ok: true, data };
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
      medioPago: formData.get("medioPago") ?? "",
      referenciaPago: formData.get("referenciaPago") ?? "",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await cambiarEstadoMembresiaEscuela(ctx, parsed.data);
    revalidatePath("/escuela/membresias");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
