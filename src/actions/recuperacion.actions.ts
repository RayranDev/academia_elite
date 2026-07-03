"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { requireAuthContext } from "@/lib/auth/session";
import {
  solicitarRecuperacion,
  fijarPasswordConCodigo,
  verificarMiEmailConCodigo,
  reenviarVerificacion,
} from "@/services/recuperacion.service";
import {
  solicitarRecuperacionSchema,
  fijarPasswordSchema,
  verificarCodigoSchema,
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
        await solicitarRecuperacion(parsed.data.email);
      } catch (e) {
        // No revelamos fallos internos: el flujo siempre responde genérico.
        console.error("[recuperar] error:", e);
      }
    }
  }

  return { ok: true };
}

/** Fija la nueva contraseña con el código (recuperación o alta de cuenta). */
export async function fijarPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = fijarPasswordSchema.safeParse({
    email: formData.get("email"),
    codigo: formData.get("codigo"),
    password: formData.get("password"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  // Rate limit por IP+email: acota el intento de fuerza bruta del código además
  // del contador de intentos por token.
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  const limit = await rateLimit(
    `fijarpw:${ip}:${parsed.data.email}`,
    10,
    15 * 60_000,
  );
  if (!limit.ok) {
    return { ok: false, error: "Demasiados intentos. Esperá un momento." };
  }

  try {
    await fijarPasswordConCodigo(
      parsed.data.email,
      parsed.data.codigo,
      parsed.data.password,
    );
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Reenvía el código de verificación al usuario logueado (rate-limited). */
export async function reenviarVerificacionAction(): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limit = await rateLimit(`reverif:${ctx.userId}`, 3, 30 * 60_000);
    if (!limit.ok) {
      return { ok: false, error: "Esperá un momento antes de reenviar." };
    }
    await reenviarVerificacion(ctx.userId);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

/** Confirma el correo del usuario logueado con el código que recibió. */
export async function verificarMiEmailAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const limit = await rateLimit(`verifemail:${ctx.userId}`, 10, 30 * 60_000);
    if (!limit.ok) {
      return { ok: false, error: "Demasiados intentos. Esperá un momento." };
    }
    const parsed = verificarCodigoSchema.safeParse({
      codigo: formData.get("codigo"),
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Código inválido.",
      };
    }
    await verificarMiEmailConCodigo(ctx.userId, parsed.data.codigo);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
