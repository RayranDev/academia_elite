"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  descuentoReglaSchema,
  editarDescuentoReglaSchema,
  asignarJugadoresSchema,
} from "@/lib/validators/descuento";
import {
  crearDescuentoReglaEscuela,
  editarDescuentoReglaEscuela,
  desactivarDescuentoReglaEscuela,
  asignarJugadoresAReglaEscuela,
} from "@/services/descuento.service";

export async function crearDescuentoReglaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = descuentoReglaSchema.safeParse({
      categoriaId: formData.get("categoriaId"),
      nombre: formData.get("nombre"),
      tipo: formData.get("tipo"),
      valor: formData.get("valor"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await crearDescuentoReglaEscuela(ctx, parsed.data);
    revalidatePath("/escuela/descuentos");
    // Membresías lee las reglas activas al generar la cobranza del mes.
    revalidatePath("/escuela/membresias");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarDescuentoReglaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = editarDescuentoReglaSchema.safeParse({
      id: formData.get("id"),
      categoriaId: formData.get("categoriaId"),
      nombre: formData.get("nombre"),
      tipo: formData.get("tipo"),
      valor: formData.get("valor"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarDescuentoReglaEscuela(ctx, parsed.data);
    revalidatePath("/escuela/descuentos");
    revalidatePath("/escuela/membresias");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function desactivarDescuentoReglaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const id = formData.get("reglaId");
    if (typeof id !== "string" || id === "") {
      throw new ValidationError("Falta la regla a desactivar.");
    }
    await desactivarDescuentoReglaEscuela(ctx, id);
    revalidatePath("/escuela/descuentos");
    revalidatePath("/escuela/membresias");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function asignarJugadoresDescuentoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = asignarJugadoresSchema.safeParse({
      reglaId: formData.get("reglaId"),
      jugadorIds: formData.getAll("jugadorIds"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await asignarJugadoresAReglaEscuela(ctx, parsed.data.reglaId, parsed.data.jugadorIds);
    revalidatePath("/escuela/descuentos");
    revalidatePath("/escuela/membresias");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
