import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { UnauthorizedError } from "@/lib/errors";
import type { Rol } from "@/types";

/**
 * Construye el AuthContext desde la sesión (Capa 2). NUNCA desde el body.
 * Completa entrenadorId / jugadorId con una consulta mínima según el rol.
 * Devuelve null si no hay sesión válida.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const ctx: AuthContext = {
    userId: session.user.id,
    rol: session.user.rol as Rol,
    escuelaId: session.user.escuelaId ?? null,
  };

  if (ctx.rol === "DT") {
    const entrenador = await db.entrenador.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (entrenador) ctx.entrenadorId = entrenador.id;
  }

  if (ctx.rol === "JUGADOR") {
    const jugador = await db.jugador.findUnique({
      where: { cuentaUserId: ctx.userId },
      select: { id: true },
    });
    if (jugador) ctx.jugadorId = jugador.id;
  }

  return ctx;
}

/** Igual que getAuthContext pero lanza si no hay sesión. */
export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}

/**
 * Guard de página (Server Component): exige sesión y rol concreto. Es la
 * seguridad real (Barrera 2); el proxy es solo UX. Redirige si no cumple.
 */
export async function requirePanelUser(rol: Rol): Promise<{
  id: string;
  rol: Rol;
  escuelaId: string | null;
  nombre: string;
}> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const actual = session.user.rol as Rol;
  if (actual !== rol) redirect(panelPorRol(actual));
  return {
    id: session.user.id,
    rol: actual,
    escuelaId: session.user.escuelaId ?? null,
    nombre: session.user.name ?? "Usuario",
  };
}

/** Ruta del panel por defecto según el rol (usada tras login y por el proxy). */
export function panelPorRol(rol: Rol): string {
  switch (rol) {
    case "SUPER_ADMIN":
      return "/admin";
    case "ESCUELA_ADMIN":
      return "/escuela";
    case "DT":
      return "/dt";
    case "JUGADOR":
      return "/jugador";
  }
}
