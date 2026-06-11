import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import type { Rol } from "@/types";

// Instancia edge-safe (solo authConfig, sin Prisma/bcrypt) para el proxy.
const { auth } = NextAuth(authConfig);

// Prefijo de ruta -> rol requerido (Barrera 1: solo UX, no es la seguridad real).
const PREFIJO_ROL: Record<string, Rol> = {
  "/admin": "SUPER_ADMIN",
  "/escuela": "ESCUELA_ADMIN",
  "/dt": "DT",
  "/jugador": "JUGADOR",
};

function panelPorRol(rol: Rol): string {
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

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const rol = req.auth?.user?.rol as Rol | undefined;

  // Construye URLs absolutas desde el HOST REAL de la petición (no desde
  // AUTH_URL): así los redirects funcionan en cualquier host/puerto.
  const host = req.headers.get("host") ?? req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const aUrl = (destino: string) => new URL(destino, `${proto}://${host}`);

  // Prefijo protegido al que apunta la petición (si alguno).
  const prefijo = Object.keys(PREFIJO_ROL).find(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // Ruta protegida sin sesión -> al login.
  if (prefijo && !rol) {
    const url = aUrl("/login");
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Sesión activa entrando al login -> a su panel.
  if (pathname === "/login" && rol) {
    return NextResponse.redirect(aUrl(panelPorRol(rol)));
  }

  // Ruta protegida de OTRO rol -> a su propio panel.
  if (prefijo && rol && PREFIJO_ROL[prefijo] !== rol) {
    return NextResponse.redirect(aUrl(panelPorRol(rol)));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/escuela/:path*", "/dt/:path*", "/jugador/:path*", "/login"],
};
