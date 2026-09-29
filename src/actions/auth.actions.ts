"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/lib/validators/auth";
import { ipCliente } from "@/lib/ip-cliente";
import { mapError, type ActionResult } from "@/lib/action-result";
import { rateLimit } from "@/lib/rate-limit";
import { panelPorRol } from "@/lib/auth/session";
import { rolPorEmail } from "@/services/otp.service";
import type { Rol } from "@/types";

// Alias sobre el contrato canónico de `@/lib/action-result` (Sección 5
// AGENTS.md): `redirectTo` va dentro de `data`, no en la raíz.
export type LoginResult = ActionResult<{ redirectTo: string }>;

/**
 * Login (Capa 2): valida con Zod, aplica rate limit 5/min por IP+email y
 * delega en Auth.js. Mensajes de error SIEMPRE genéricos (no revela cuentas).
 */
export async function login(
  _prev: LoginResult | undefined,
  formData: FormData,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Credenciales inválidas." };
  }

  try {
    const ip = ipCliente(await headers());
    const limit = await rateLimit(`login:${ip}:${parsed.data.email}`, 5, 60_000);
    if (!limit.ok) {
      return {
        ok: false,
        error: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
      };
    }

    try {
      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return { ok: false, error: "Credenciales inválidas." };
      }
      throw error;
    }

    // Login correcto: resolvemos el panel destino según el rol del usuario.
    const rol = await rolPorEmail(parsed.data.email);
    const redirectTo = rol ? panelPorRol(rol as Rol) : "/login";
    return { ok: true, data: { redirectTo } };
  } catch (e) {
    return mapError(e);
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
