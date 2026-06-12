import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
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

/**
 * Versión para páginas/acciones: si no hay sesión va a /login; si la sesión
 * apunta a un usuario inexistente (p. ej. tras un re-seed) limpia la cookie vía
 * /api/salir. Así nunca se cae con un 500 por sesión obsoleta.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { activo: true, bloqueado: true, rol: true },
  });
  if (!user || !user.activo) redirect("/api/salir");
  // Familia bloqueada por la escuela → pantalla con el motivo (G2).
  if (user.bloqueado && user.rol === "JUGADOR") redirect("/bloqueado");
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
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

  // La sesión (JWT) puede apuntar a un usuario que ya no existe (p. ej. tras un
  // re-seed de la BD en desarrollo). En ese caso forzamos re-login en vez de
  // dejar que las consultas de tenant fallen con un 500.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, activo: true, bloqueado: true },
  });
  // Redirige a un endpoint que limpia la cookie (si fuéramos a /login el proxy
  // nos reenviaría al panel y entraríamos en bucle).
  if (!user || !user.activo) redirect("/api/salir");
  // Familia bloqueada por la escuela → pantalla con el motivo (G2).
  if (user.bloqueado && actual === "JUGADOR") redirect("/bloqueado");

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
