/**
 * Cookies de Auth.js y cómo borrarlas.
 *
 * Sobre HTTPS Auth.js usa nombres con prefijo (`__Secure-authjs.session-token`,
 * `__Host-authjs.csrf-token`) y los navegadores RECHAZAN cualquier Set-Cookie de
 * un nombre así que no lleve `Secure`, incluidos los borrados. Un
 * `cookies().delete(name)` pelado emite el borrado sin `Secure`, así que en
 * producción la cookie sobrevivía y el usuario quedaba en bucle entre el guard y
 * `/api/salir`. Por eso el borrado repite los atributos con los que Auth.js
 * crea cada cookie: `path: "/"`, `httpOnly`, `sameSite: "lax"` y `secure` para
 * los prefijos `__Secure-` y `__Host-` (y nunca `domain`, que `__Host-` prohíbe).
 */

/** ¿Es una cookie de Auth.js? Incluye los fragmentos (`…session-token.0`, `.1`). */
export function esCookieDeAuth(nombre: string): boolean {
  return nombre.includes("authjs");
}

/** Nombres de las cookies de un header `Cookie`. */
export function nombresDeCookies(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(";")
    .map((par) => par.split("=")[0]?.trim() ?? "")
    .filter(Boolean);
}

/** Atributos con los que se borra una cookie de Auth.js para que el navegador acepte el borrado. */
export function opcionesDeBorrado(nombre: string) {
  const prefijada = nombre.startsWith("__Secure-") || nombre.startsWith("__Host-");
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: prefijada,
    maxAge: 0,
    expires: new Date(0),
  };
}
