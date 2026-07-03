"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { urlBase } from "@/lib/url";
import { requireAuthContext } from "@/lib/auth/session";
import {
  solicitarRecuperacion,
  fijarPasswordConToken,
  verificarEmailConToken,
  reenviarVerificacion,
} from "@/services/recuperacion.service";
import {
  solicitarRecuperacionSchema,
  fijarPasswordSchema,
} from "@/lib/validators/recuperacion";
import { mapError, type ActionResult } from "@/lib/action-result";

/**
 * "Olvidé mi contraseña". Respuesta SIEMPRE genérica (`ok: true`) aunque el
 * email no exista o sea inválido: nunca revelamos si una cuenta existe. Rate
 * limit por IP+email para no permitir bombardeo de correos.
 */
export async function recuperarPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = solicitarRecuperacionSchema.safeParse({
    email: formData.get("email"),
  });

  if (parsed.success) {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
    const limit = await rateLimit(
      `recuperar:${ip}:${parsed.data.email}`,
      3,
      15 * 60_000,
    );
    if (limit.ok) {
      try {
        await solicitarRecuperacion(parsed.data.email, await urlBase());
      } catch (e) {
        // No revelamos fallos internos: el flujo siempre responde genérico.
        console.error("[recuperar] error:", e);
      }
    }
  }

  return { ok: true };
}

/** Fija la nueva contraseña desde el enlace (recuperación o set-password). */
export async function fijarPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = fijarPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  try {
    await fijarPasswordConToken(parsed.data.token, parsed.data.password);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Reenvía el correo de verificación al usuario logueado (rate-limited). */
export async function reenviarVerificacionAction(): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limit = await rateLimit(`reverif:${ctx.userId}`, 3, 30 * 60_000);
    if (!limit.ok) {
      return { ok: false, error: "Esperá un momento antes de reenviar." };
    }
    await reenviarVerificacion(ctx.userId, await urlBase());
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Confirma el correo desde el enlace de verificación. */
export async function verificarEmailAction(
  token: string,
): Promise<{ ok: boolean }> {
  try {
    return { ok: await verificarEmailConToken(token) };
  } catch (e) {
    console.error("[verificar] error:", e);
    return { ok: false };
  }
}
