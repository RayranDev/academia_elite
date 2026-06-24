"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/lib/validators/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { panelPorRol } from "@/lib/auth/session";
import type { Rol } from "@/types";

export type ActionResult =
  | { ok: true; redirectTo?: string }
  | { ok: false; error: string };

/**
 * Login (Capa 2): valida con Zod, aplica rate limit 5/min por IP+email y
 * delega en Auth.js. Mensajes de error SIEMPRE genéricos (no revela cuentas).
 */
export async function login(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Credenciales inválidas." };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  const limit = rateLimit(`login:${ip}:${parsed.data.email}`, 5, 60_000);
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
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { rol: true },
  });
  const redirectTo = user ? panelPorRol(user.rol as Rol) : "/login";
  return { ok: true, redirectTo };
}

export async function logout(): Promise<void> {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;
  await signOut({ redirectTo: `${baseUrl}/login` });
}
