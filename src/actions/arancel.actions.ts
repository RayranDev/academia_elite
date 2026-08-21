"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  arancelSchema,
  editarArancelSchema,
  arancelDesdeFormData,
  editarArancelDesdeFormData,
} from "@/lib/validators/arancel";
import {
  crearArancelEscuela,
  desactivarArancelEscuela,
  editarArancelEscuela,
} from "@/services/arancel.service";

/**
 * Las tres pantallas que leen la lista de precios. Van juntas: el aviso de
 * "todavía no cargaste precios" vive en Membresías y el conteo de uso por
 * concepto en Conceptos, así que refrescar solo Precios deja a las otras dos
 * mostrando algo que ya es falso.
 */
function revalidarPrecios(): void {
  revalidatePath("/escuela/aranceles");
  revalidatePath("/escuela/membresias");
  revalidatePath("/escuela/conceptos");
}

export async function crearArancelAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = arancelSchema.safeParse(arancelDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    // Presente solo cuando la UI detectó un duplicado activo y el usuario
    // confirmó el reemplazo (ver ArancelesPanel): no es un campo del form.
    const reemplazarIdRaw = formData.get("reemplazarId");
    const reemplazarId =
      typeof reemplazarIdRaw === "string" && reemplazarIdRaw !== ""
        ? reemplazarIdRaw
        : undefined;
    await crearArancelEscuela(ctx, parsed.data, reemplazarId);
    revalidarPrecios();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarArancelAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = editarArancelSchema.safeParse(editarArancelDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarArancelEscuela(ctx, parsed.data);
    revalidarPrecios();
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
    revalidarPrecios();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
