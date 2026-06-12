"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  logroCrearSchema,
  logroEditarSchema,
  logroActivoSchema,
  logroVentanaSchema,
  otorgarLogroSchema,
} from "@/lib/validators/logro";
import {
  crearLogroAdmin,
  editarLogroAdmin,
  activarLogroAdmin,
  crearLogroDt,
  configurarLogroDt,
  otorgarLogroDt,
} from "@/services/logro.service";

// Server Actions del catálogo de logros (G6).

function parseLogroCrear(formData: FormData) {
  const parsed = logroCrearSchema.safeParse({
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion"),
    tipo: formData.get("tipo"),
    statBonus: formData.get("statBonus") ?? "",
    valorBonus: formData.get("valorBonus") ?? "",
    repetible: formData.get("repetible") === "on",
    posicion: formData.get("posicion") ?? "",
    icono: formData.get("icono") || "medal",
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }
  return parsed.data;
}

export async function crearLogroAdminAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    await crearLogroAdmin(ctx, parseLogroCrear(formData));
    revalidatePath("/admin/logros");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarLogroAdminAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = logroEditarSchema.safeParse({
      logroId: formData.get("logroId"),
      nombre: formData.get("nombre"),
      descripcion: formData.get("descripcion"),
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await editarLogroAdmin(ctx, parsed.data.logroId, {
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion,
    });
    revalidatePath("/admin/logros");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function activarLogroAdminAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = logroActivoSchema.safeParse({
      logroId: formData.get("logroId"),
      activo: formData.get("activo") === "true",
    });
    if (!parsed.success) throw new ValidationError("Datos inválidos.");
    await activarLogroAdmin(ctx, parsed.data.logroId, parsed.data.activo);
    revalidatePath("/admin/logros");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function crearLogroDtAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    await crearLogroDt(ctx, parseLogroCrear(formData));
    revalidatePath("/dt/logros");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function configurarLogroDtAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = logroVentanaSchema.safeParse({
      logroId: formData.get("logroId"),
      activo: formData.get("activo") === "on",
      desde: formData.get("desde") ?? "",
      hasta: formData.get("hasta") ?? "",
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }
    await configurarLogroDt(ctx, parsed.data);
    revalidatePath("/dt/logros");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function otorgarLogroDtAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = otorgarLogroSchema.safeParse({
      logroId: formData.get("logroId"),
      jugadorId: formData.get("jugadorId"),
    });
    if (!parsed.success) throw new ValidationError("Datos inválidos.");
    await otorgarLogroDt(ctx, parsed.data.jugadorId, parsed.data.logroId);
    revalidatePath("/dt/logros");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
