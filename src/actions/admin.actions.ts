"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  convertirLeadSchema,
  crearEscuelaSchema,
  editarLeadSchema,
  agregarNotaSchema,
  actualizarParametroSchema,
} from "@/lib/validators/admin";
import { actualizarLead, agregarNotaLead } from "@/services/lead.service";
import { convertirLeadEnEscuela, crearEscuelaDirecta } from "@/services/escuela.service";
import { actualizarParametro } from "@/services/parametro.service";
import {
  fijarMetricaEscuelaAdmin,
  quitarMetricaEscuelaAdmin,
} from "@/services/parametro-escuela.service";

export async function convertirLeadAction(
  _prev: ActionResult<{ adminEmail: string; passwordTemporal: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ adminEmail: string; passwordTemporal: string }>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = convertirLeadSchema.safeParse({
      leadId: formData.get("leadId"),
      nombreEscuela: formData.get("nombreEscuela"),
      slug: formData.get("slug"),
      adminNombre: formData.get("adminNombre"),
      adminEmail: formData.get("adminEmail"),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Datos inválidos.",
      );
    }
    const res = await convertirLeadEnEscuela(ctx, parsed.data);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/escuelas");
    revalidatePath("/admin/auditoria");
    return {
      ok: true,
      data: { adminEmail: res.adminEmail, passwordTemporal: res.passwordTemporal },
    };
  } catch (e) {
    return mapError(e);
  }
}

/** Edita estado + seguimiento del lead (mini-CRM). */
export async function actualizarLeadAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const leadId = formData.get("leadId");
    if (typeof leadId !== "string" || !leadId) {
      throw new ValidationError("Lead inválido.");
    }
    const parsed = editarLeadSchema.safeParse({
      estado: formData.get("estado"),
      responsable: formData.get("responsable"),
      proximaAccion: formData.get("proximaAccion") ?? "",
      fechaProximoContacto: formData.get("fechaProximoContacto") ?? "",
      observaciones: formData.get("observaciones") ?? "",
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Datos inválidos.",
      );
    }
    await actualizarLead(ctx, leadId, parsed.data);
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/auditoria");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Agrega una nota de seguimiento a un lead. */
export async function agregarNotaLeadAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = agregarNotaSchema.safeParse({
      leadId: formData.get("leadId"),
      comentario: formData.get("comentario"),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Datos inválidos.",
      );
    }
    await agregarNotaLead(ctx, parsed.data.leadId, parsed.data.comentario);
    revalidatePath(`/admin/leads/${parsed.data.leadId}`);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Alta directa de escuela + ESCUELA_ADMIN inicial (SUPER_ADMIN, sin pasar por lead). */
export async function crearEscuelaAction(
  _prev: ActionResult<{ adminEmail: string; passwordTemporal: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ adminEmail: string; passwordTemporal: string }>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = crearEscuelaSchema.safeParse({
      nombreEscuela: formData.get("nombreEscuela"),
      slug: formData.get("slug"),
      adminNombre: formData.get("adminNombre"),
      adminEmail: formData.get("adminEmail"),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Datos inválidos.",
      );
    }
    const res = await crearEscuelaDirecta(ctx, parsed.data);
    revalidatePath("/admin/escuelas");
    revalidatePath("/admin/auditoria");
    return {
      ok: true,
      data: { adminEmail: res.adminEmail, passwordTemporal: res.passwordTemporal },
    };
  } catch (e) {
    return mapError(e);
  }
}

// Acción de formulario: actualiza un parámetro de fórmula (auditado).
export async function actualizarParametroAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = actualizarParametroSchema.safeParse({
    clave: formData.get("clave"),
    valor: formData.get("valor"),
  });
  if (!parsed.success) throw new ValidationError("Valor inválido.");
  await actualizarParametro(ctx, parsed.data.clave, parsed.data.valor);
  revalidatePath("/admin/parametros");
  revalidatePath("/admin/auditoria");
}

/** Fija un override de métrica para una escuela puntual (SUPER_ADMIN). */
export async function fijarMetricaEscuelaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const escuelaId = formData.get("escuelaId");
    const clave = formData.get("clave");
    const valor = Number(formData.get("valor"));
    if (typeof escuelaId !== "string" || !escuelaId) {
      throw new ValidationError("Falta la escuela.");
    }
    if (typeof clave !== "string" || !clave) throw new ValidationError("Métrica inválida.");
    if (!Number.isFinite(valor)) throw new ValidationError("Valor inválido.");
    await fijarMetricaEscuelaAdmin(ctx, escuelaId, clave, valor);
    revalidatePath("/admin/parametros");
    revalidatePath("/admin/auditoria");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Quita el override de una escuela (vuelve al global). (SUPER_ADMIN). */
export async function quitarMetricaEscuelaAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const escuelaId = formData.get("escuelaId");
    const clave = formData.get("clave");
    if (typeof escuelaId !== "string" || !escuelaId) {
      throw new ValidationError("Falta la escuela.");
    }
    if (typeof clave !== "string" || !clave) throw new ValidationError("Métrica inválida.");
    await quitarMetricaEscuelaAdmin(ctx, escuelaId, clave);
    revalidatePath("/admin/parametros");
    revalidatePath("/admin/auditoria");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
