import { NextResponse } from "next/server";
import {
  esCookieDeAuth,
  nombresDeCookies,
  opcionesDeBorrado,
} from "@/lib/auth/cookies-sesion";

/**
 * Limpia las cookies de sesión de Auth.js y vuelve al login. Es el destino de los
 * guards cuando la sesión (JWT) ya no vale: el usuario no existe (p. ej. tras un
 * re-seed), fue desactivado o la sesión fue revocada por un cambio de contraseña.
 * Ir a /login directo no sirve: el proxy, que solo mira el JWT, lo devolvería al
 * panel y entraría en bucle.
 *
 * El borrado repite los atributos de cada cookie (`Secure` para los nombres
 * `__Secure-`/`__Host-`): sin ellos el navegador lo rechaza sobre HTTPS y la
 * sesión sobrevive (ver `cookies-sesion.ts`).
 */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login?expirada=1", req.url));
  for (const nombre of nombresDeCookies(req.headers.get("cookie"))) {
    if (esCookieDeAuth(nombre)) {
      res.cookies.set(nombre, "", opcionesDeBorrado(nombre));
    }
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}
