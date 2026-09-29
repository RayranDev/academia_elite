"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { mapError, type ActionResult } from "@/lib/action-result";
import { panelPorRol } from "@/lib/auth/session";
import { ipCliente } from "@/lib/ip-cliente";
import { rateLimit } from "@/lib/rate-limit";
import { solicitarOtp, rolPorEmail } from "@/services/otp.service";
import { solicitarOtpSchema, otpLoginSchema } from "@/lib/validators/auth";
import type { Rol } from "@/types";

// Alias sobre el contrato canónico de `@/lib/action-result` (Sección 5
// AGENTS.md): `redirectTo` va dentro de `data`, no en la raíz.
export type OtpResult = ActionResult<{ redirectTo: string }>;

/**
 * Pide un código OTP por correo. Respuesta SIEMPRE genérica (`ok: true`): no
 * revelamos si el correo existe. Rate limit por IP+email.
 */
export async function solicitarOtpAction(
  _prev: OtpResult | undefined,
  formData: FormData,
): Promise<OtpResult> {
  const parsed = solicitarOtpSchema.safeParse({ email: formData.get("email") });
  if (parsed.success) {
    try {
      const limit = await rateLimit(
        `otp-pedir:${ipCliente(await headers())}:${parsed.data.email}`,
        3,
        15 * 60_000,
      );
      if (limit.ok) {
        try {
          await solicitarOtp(parsed.data.email);
        } catch (e) {
          console.error("[otp] error al solicitar:", e);
        }
      }
    } catch (e) {
      // No revelamos fallos internos: el flujo siempre responde genérico.
      console.error("[otp] error inesperado al pedir código:", e);
    }
  }
  return { ok: true };
}

/**
 * Inicia sesión con el código OTP. El rate limit acá acota la fuerza bruta del
 * código (el provider solo valida). Mensajes genéricos.
 */
export async function ingresarConOtpAction(
  _prev: OtpResult | undefined,
  formData: FormData,
): Promise<OtpResult> {
  const parsed = otpLoginSchema.safeParse({
    email: formData.get("email"),
    codigo: formData.get("codigo"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Código inválido." };
  }

  try {
    const limit = await rateLimit(
      `otp-login:${ipCliente(await headers())}:${parsed.data.email}`,
      5,
      15 * 60_000,
    );
    if (!limit.ok) {
      return { ok: false, error: "Demasiados intentos. Espera un momento." };
    }

    try {
      await signIn("otp", {
        email: parsed.data.email,
        codigo: parsed.data.codigo,
        redirect: false,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return { ok: false, error: "El código no es válido o ya venció." };
      }
      throw error;
    }

    const rol = await rolPorEmail(parsed.data.email);
    return {
      ok: true,
      data: { redirectTo: rol ? panelPorRol(rol as Rol) : "/login" },
    };
  } catch (e) {
    return mapError(e);
  }
}
