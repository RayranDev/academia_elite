"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  membresiaSchema,
  cambiarEstadoMembresiaSchema,
  generarCuotasSchema,
  membresiaDesdeFormData,
  generarCuotasDesdeFormData,
  cambiarEstadoDesdeFormData,
} from "@/lib/validators/membresia";
import {
  registrarMembresiaEscuela,
  cambiarEstadoMembresiaEscuela,
  generarCuotasDelPeriodo,
  type GeneracionCuotasDTO,
} from "@/services/membresia.service";

/**
 * Todo lo que cambia al tocar una cuota: el listado, el dashboard (monto vencido
 * y jugadores en mora salen de estas filas) y el catálogo de conceptos, que
 * cuenta cuántas cuotas usa cada uno para decidir si se puede borrar.
 */
function revalidarCobranza(): void {
  revalidatePath("/escuela/membresias");
  revalidatePath("/escuela");
  revalidatePath("/escuela/conceptos");
}

export async function registrarMembresiaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = membresiaSchema.safeParse(membresiaDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await registrarMembresiaEscuela(ctx, parsed.data);
    revalidarCobranza();
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
    const parsed = generarCuotasSchema.safeParse(generarCuotasDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    const data = await generarCuotasDelPeriodo(
      ctx,
      parsed.data.periodo,
      parsed.data.conceptoId,
    );
    revalidarCobranza();
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
    const parsed = cambiarEstadoMembresiaSchema.safeParse(
      cambiarEstadoDesdeFormData(formData),
    );
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await cambiarEstadoMembresiaEscuela(ctx, parsed.data);
    revalidarCobranza();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
