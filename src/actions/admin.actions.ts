"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  actualizarEstadoLeadSchema,
  convertirLeadSchema,
  actualizarParametroSchema,
} from "@/lib/validators/admin";
import { actualizarEstadoLead } from "@/services/lead.service";
import { convertirLeadEnEscuela } from "@/services/escuela.service";
import { actualizarParametro } from "@/services/parametro.service";

// Acción de formulario (fire-and-forget): mueve el lead en el pipeline.
// revalidatePath refresca la vista; los errores de dominio se propagan al
// error boundary (entradas controladas por inputs ocultos).
export async function actualizarEstadoLeadAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = actualizarEstadoLeadSchema.safeParse({
    leadId: formData.get("leadId"),
    estado: formData.get("estado"),
  });
  if (!parsed.success) throw new ValidationError("Datos inválidos.");
  await actualizarEstadoLead(ctx, parsed.data.leadId, parsed.data.estado);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/auditoria");
}

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
