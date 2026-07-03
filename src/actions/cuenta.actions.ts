"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import {
  actualizarNombreSchema,
  solicitarCambioEmailSchema,
  confirmarCambioEmailSchema,
} from "@/lib/validators/cuenta";
import {
  actualizarMiNombre,
  solicitarCambioEmail,
  confirmarCambioEmail,
} from "@/services/cuenta.service";

// Autoservicio de "Mi cuenta" (JUGADOR / DT). Frontera: sesión + Zod + rate
// limit; la autorización real y la lógica viven en el servicio.

const RUTAS_CUENTA = ["/jugador/cuenta", "/dt/cuenta"];

function revalidarCuenta() {
  for (const ruta of RUTAS_CUENTA) revalidatePath(ruta);
}

export async function actualizarMiNombreAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = actualizarNombreSchema.safeParse({
      nombre: formData.get("nombre"),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Datos inválidos.",
      );
    }
    await actualizarMiNombre(ctx, parsed.data.nombre);
    revalidarCuenta();
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function solicitarCambioEmailAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`cambioemail:${ctx.userId}`, 3, 30 * 60 * 1000);
    if (!limite.ok) {
      throw new ValidationError("Demasiados intentos. Esperá un momento.");
    }
    const parsed = solicitarCambioEmailSchema.safeParse({
      email: formData.get("email"),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Email inválido.",
      );
    }
    await solicitarCambioEmail(ctx, parsed.data.email);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function confirmarCambioEmailAction(
  _prev: ActionResult<{ email: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  try {
    const ctx = await requireAuthContext();
    const limite = await rateLimit(`confirmemail:${ctx.userId}`, 10, 30 * 60 * 1000);
    if (!limite.ok) {
      throw new ValidationError("Demasiados intentos. Esperá un momento.");
    }
    const parsed = confirmarCambioEmailSchema.safeParse({
      codigo: formData.get("codigo"),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Código inválido.",
      );
    }
    const email = await confirmarCambioEmail(ctx, parsed.data.codigo);
    revalidarCuenta();
    return { ok: true, data: { email } };
  } catch (e) {
    return mapError(e);
  }
}
