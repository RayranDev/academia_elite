"use server";

import { headers } from "next/headers";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { registroSchema, vincularHijoSchema } from "@/lib/validators/registro";
import { registrarConCodigo, registrarPadreYVincular } from "@/services/registro.service";

function primerError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Datos inválidos.";
}

/** Auto-registro del padre con código (público, rate-limited). */
export async function registrarConCodigoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
    const limit = rateLimit(`registro:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      throw new ValidationError("Demasiados intentos. Inténtalo más tarde.");
    }

    const parsed = registroSchema.safeParse(
      Object.fromEntries(formData.entries()),
    );
    if (!parsed.success) {
      throw new ValidationError(primerError(parsed.error.issues));
    }
    await registrarConCodigo(parsed.data);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Registro del padre vinculándose a un hijo existente (público, rate-limited). */
export async function vincularHijoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
    const limit = rateLimit(`vincular:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      throw new ValidationError("Demasiados intentos. Inténtalo más tarde.");
    }

    const parsed = vincularHijoSchema.safeParse(
      Object.fromEntries(formData.entries()),
    );
    if (!parsed.success) {
      throw new ValidationError(primerError(parsed.error.issues));
    }
    await registrarPadreYVincular(parsed.data);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
