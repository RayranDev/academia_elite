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

  // Prefijo protegido al que apunta la petición (si alguno).
  const prefijo = Object.keys(PREFIJO_ROL).find(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // Ruta protegida sin sesión -> al login.
  if (prefijo && !rol) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Sesión activa entrando al login -> a su panel.
  if (pathname === "/login" && rol) {
    return NextResponse.redirect(new URL(panelPorRol(rol), req.nextUrl));
  }

  // Ruta protegida de OTRO rol -> a su propio panel.
  if (prefijo && rol && PREFIJO_ROL[prefijo] !== rol) {
    return NextResponse.redirect(new URL(panelPorRol(rol), req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/escuela/:path*", "/dt/:path*", "/jugador/:path*", "/login"],
};
