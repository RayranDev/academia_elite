"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  crearConceptoCobroSchema,
  editarConceptoCobroSchema,
  crearConceptoDesdeFormData,
  editarConceptoDesdeFormData,
} from "@/lib/validators/concepto-cobro";
import {
  crearConceptoEscuela,
  editarConceptoEscuela,
  borrarConceptoEscuela,
} from "@/services/concepto-cobro.service";

/**
 * Las tres pantallas que leen el catálogo. Se revalidan juntas porque un
 * concepto renombrado o archivado cambia lo que muestran las tres: si solo se
 * refrescara la propia, el `<select>` de precios seguiría ofreciendo un
 * concepto que la escuela acaba de archivar.
 */
function revalidarCatalogo(): void {
  revalidatePath("/escuela/conceptos");
  revalidatePath("/escuela/aranceles");
  revalidatePath("/escuela/membresias");
}

export async function crearConceptoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = crearConceptoCobroSchema.safeParse(
      crearConceptoDesdeFormData(formData),
    );
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await crearConceptoEscuela(ctx, parsed.data);
    revalidarCatalogo();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarConceptoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = editarConceptoCobroSchema.safeParse(
      editarConceptoDesdeFormData(formData),
    );
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarConceptoEscuela(ctx, parsed.data);
    revalidarCatalogo();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function borrarConceptoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const id = formData.get("conceptoId");
    if (typeof id !== "string" || id === "") {
      throw new ValidationError("Falta el concepto a borrar.");
    }
    await borrarConceptoEscuela(ctx, id);
    revalidarCatalogo();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
