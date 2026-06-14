"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { fondoCrearSchema, fondoEditarSchema } from "@/lib/validators/fondo";
import {
  crearFondoAdmin,
  editarFondoAdmin,
  eliminarFondoAdmin,
} from "@/services/fondo.service";

// Server Actions del laboratorio de fondos (Súper Admin).

function campos(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion"),
    estilo: formData.get("estilo"),
    colorTexto: formData.get("colorTexto") ?? "",
    requisitoTipo: formData.get("requisitoTipo"),
    requisitoValor: formData.get("requisitoValor") ?? "",
    orden: formData.get("orden") ?? "",
  };
}

export async function crearFondoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = fondoCrearSchema.safeParse({
      codigo: formData.get("codigo"),
      ...campos(formData),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await crearFondoAdmin(ctx, parsed.data);
    revalidatePath("/admin/fondos");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarFondoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = fondoEditarSchema.safeParse({
      fondoId: formData.get("fondoId"),
      ...campos(formData),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarFondoAdmin(ctx, parsed.data);
    revalidatePath("/admin/fondos");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function eliminarFondoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const fondoId = formData.get("fondoId");
    if (typeof fondoId !== "string" || !fondoId) {
      throw new ValidationError("Falta el fondo.");
    }
    await eliminarFondoAdmin(ctx, fondoId);
    revalidatePath("/admin/fondos");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
