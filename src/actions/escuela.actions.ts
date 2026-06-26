"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  brandingSchema,
  categoriaSchema,
  sedeSchema,
  canchaSchema,
  dtSchema,
  codigoSchema,
  enviarCodigoSchema,
} from "@/lib/validators/escuela";
import { actualizarBranding, subirEscudo } from "@/services/escuela.service";
import { MAX_ESCUDO_BYTES } from "@/lib/foto/process";
import { crearCategoriaEscuela } from "@/services/categoria.service";
import { crearSedeEscuela, crearCanchaEscuela } from "@/services/sede.service";
import { crearDt } from "@/services/entrenador.service";
import {
  crearCodigoEscuela,
  desactivarCodigoEscuela,
  enviarCodigoPorCorreo,
} from "@/services/codigo.service";

function primerError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Datos inválidos.";
}

export async function actualizarBrandingAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = brandingSchema.safeParse({
    nombre: formData.get("nombre"),
    colorPrimario: formData.get("colorPrimario"),
    frecuenciaEvaluacionDias: formData.get("frecuenciaEvaluacionDias"),
  });
  if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
  await actualizarBranding(ctx, parsed.data);
  revalidatePath("/escuela", "layout");
}

export async function subirEscudoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const file = formData.get("escudo");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("Selecciona un PNG.");
    }
    if (file.size > MAX_ESCUDO_BYTES) {
      throw new ValidationError("El escudo supera 1 MB.");
    }
    const buf = Buffer.from(await file.arrayBuffer());
    await subirEscudo(ctx, buf);
    revalidatePath("/escuela", "layout");
    revalidatePath("/escuela/branding");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function crearCategoriaAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = categoriaSchema.safeParse({
    nombre: formData.get("nombre"),
    anioDesde: formData.get("anioDesde"),
    anioHasta: formData.get("anioHasta"),
  });
  if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
  await crearCategoriaEscuela(ctx, parsed.data);
  revalidatePath("/escuela/categorias");
}

export async function crearSedeAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = sedeSchema.safeParse({
    nombre: formData.get("nombre"),
    direccion: formData.get("direccion"),
  });
  if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
  await crearSedeEscuela(ctx, {
    nombre: parsed.data.nombre,
    direccion: parsed.data.direccion || undefined,
  });
  revalidatePath("/escuela/sedes");
}

export async function crearCanchaAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = canchaSchema.safeParse({
    sedeId: formData.get("sedeId"),
    nombre: formData.get("nombre"),
  });
  if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
  await crearCanchaEscuela(ctx, parsed.data.sedeId, parsed.data.nombre);
  revalidatePath("/escuela/sedes");
}

export async function crearDtAction(
  _prev: ActionResult<{ email: string; passwordTemporal: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ email: string; passwordTemporal: string }>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = dtSchema.safeParse({
      nombre: formData.get("nombre"),
      email: formData.get("email"),
      categoriaIds: formData.getAll("categoriaIds"),
    });
    if (!parsed.success) {
      throw new ValidationError(primerError(parsed.error.issues));
    }
    const res = await crearDt(ctx, parsed.data);
    revalidatePath("/escuela/dts");
    return { ok: true, data: res };
  } catch (e) {
    return mapError(e);
  }
}

export async function crearCodigoAction(
  _prev: ActionResult<{ codigo: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ codigo: string }>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = codigoSchema.safeParse({
      categoriaId: formData.get("categoriaId"),
      usosMaximos: formData.get("usosMaximos"),
      diasValidez: formData.get("diasValidez"),
    });
    if (!parsed.success) {
      throw new ValidationError(primerError(parsed.error.issues));
    }
    const res = await crearCodigoEscuela(ctx, parsed.data);
    revalidatePath("/escuela/codigos");
    return { ok: true, data: res };
  } catch (e) {
    return mapError(e);
  }
}

export async function desactivarCodigoAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuthContext();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) throw new ValidationError("Código inválido.");
  await desactivarCodigoEscuela(ctx, id);
  revalidatePath("/escuela/codigos");
}

/** Envía un código de invitación al correo de una familia (ESCUELA_ADMIN). */
export async function enviarCodigoInvitacionAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = enviarCodigoSchema.safeParse({
      codigoId: formData.get("codigoId"),
      email: formData.get("email"),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Datos inválidos.",
      );
    }
    await enviarCodigoPorCorreo(ctx, parsed.data.codigoId, parsed.data.email);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

// Las métricas de evaluación se gestionan solo desde el panel del SUPER_ADMIN
// (con selección explícita de escuela). La escuela ya no puede moverlas.
