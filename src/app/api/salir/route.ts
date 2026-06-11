import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Limpia las cookies de sesión de Auth.js y vuelve al login. Se usa cuando la
 * sesión (JWT) apunta a un usuario que ya no existe (p. ej. tras un re-seed de
 * la BD en desarrollo), evitando bucles de redirección con el proxy.
 */
export async function GET(req: Request) {
  const store = await cookies();
  for (const c of store.getAll()) {
    if (c.name.includes("authjs")) {
      store.delete(c.name);
    }
  }
  return NextResponse.redirect(new URL("/login?expirada=1", req.url));
}
