"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { panelPorRol } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { solicitarOtp, rolPorEmail } from "@/services/otp.service";
import { solicitarOtpSchema, otpLoginSchema } from "@/lib/validators/auth";
import type { Rol } from "@/types";

export type OtpResult =
  | { ok: true; redirectTo?: string }
  | { ok: false; error: string };

async function ipDeRequest(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
}

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
    const limit = await rateLimit(
      `otp-pedir:${await ipDeRequest()}:${parsed.data.email}`,
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

  const limit = await rateLimit(
    `otp-login:${await ipDeRequest()}:${parsed.data.email}`,
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
  return { ok: true, redirectTo: rol ? panelPorRol(rol as Rol) : "/login" };
}
