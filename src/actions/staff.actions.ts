"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { staffSchema, editarStaffSchema } from "@/lib/validators/staff";
import {
  crearStaffEscuela,
  editarStaffEscuela,
  eliminarStaffEscuela,
} from "@/services/staff.service";

export async function crearStaffAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = staffSchema.safeParse({
      cargo: formData.get("cargo"),
      nombre: formData.get("nombre"),
      telefono: formData.get("telefono") ?? "",
      email: formData.get("email") ?? "",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await crearStaffEscuela(ctx, parsed.data);
    revalidatePath("/escuela/staff");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarStaffAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = editarStaffSchema.safeParse({
      id: formData.get("id"),
      cargo: formData.get("cargo"),
      nombre: formData.get("nombre"),
      telefono: formData.get("telefono") ?? "",
      email: formData.get("email") ?? "",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarStaffEscuela(ctx, parsed.data);
    revalidatePath("/escuela/staff");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function eliminarStaffAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const id = formData.get("staffId");
    if (typeof id !== "string" || id === "") {
      throw new ValidationError("Falta el staff a eliminar.");
    }
    await eliminarStaffEscuela(ctx, id);
    revalidatePath("/escuela/staff");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
