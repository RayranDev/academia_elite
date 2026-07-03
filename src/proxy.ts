import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import type { Rol } from "@/types";

// En desarrollo, eliminamos las URLs estáticas si apuntan a localhost para que
// NextAuth detecte automáticamente el host real (ej. ngrok) gracias a trustHost: true.
if (process.env.NODE_ENV === "development") {
  if (process.env.AUTH_URL?.includes("localhost")) {
    delete process.env.AUTH_URL;
  }
  if (process.env.NEXTAUTH_URL?.includes("localhost")) {
    delete process.env.NEXTAUTH_URL;
  }
}

// Instancia edge-safe (solo authConfig, sin Prisma/bcrypt) para el proxy.
const { auth } = NextAuth(authConfig);

const isDev = process.env.NODE_ENV !== "production";

// Prefijo de ruta -> rol requerido (Barrera 1: solo UX, no es la seguridad real).
const PREFIJO_ROL: Record<string, Rol> = {
  "/admin": "SUPER_ADMIN",
  "/escuela": "ESCUELA_ADMIN",
  "/dt": "DT",
  "/jugador": "JUGADOR",
};

/**
 * Content-Security-Policy (Sección 6.6). Se emite ACÁ y NO en next.config
 * porque `headers()` sólo ACUMULA cabeceras: dos reglas solapadas producirían
 * dos CSP y el navegador tomaría la intersección (la más restrictiva), anulando
 * el 'unsafe-eval'. Acá se emite UNA sola CSP por request, decidida por ruta.
 *
 * Producción es estricta: NUNCA 'unsafe-eval' de forma global. La ÚNICA
 * excepción es `/jugador/perfil` (`allowEval: true`), donde
 * @imgly/background-removal usa `new Function`/`eval` para decodificar la imagen
 * en el navegador. 'wasm-unsafe-eval' compila el WASM sin habilitar eval() de
 * JS; blob: cubre los workers de onnxruntime-web; el modelo es 100% self-hosted
 * (/imgly/, mismo origen, sin CDN). En dev se agrega 'unsafe-eval' + websockets
 * para el HMR de Next. Next inyecta scripts inline -> 'unsafe-inline'.
 *
 * NO se ponen COOP/COEP en /jugador/perfil a propósito: al marcar la página como
 * crossOriginIsolated, onnxruntime-web intenta el camino multi-thread con
 * SharedArrayBuffer/workers y FALLA. Sin ese aislamiento corre single-thread
 * (unos segundos más lento) y funciona.
 */
function construirCsp(permitirEval: boolean): string {
  const evalSrc = isDev || permitirEval ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${evalSrc}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' blob:${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!isDev ? ["upgrade-insecure-requests"] : []),
  ]
    .join("; ")
    .concat(";");
}

/** Adjunta la CSP correcta según la ruta a cualquier respuesta del proxy. */
function conCsp(res: NextResponse, pathname: string): NextResponse {
  const permitirEval = pathname === "/jugador/perfil";
  res.headers.set("Content-Security-Policy", construirCsp(permitirEval));
  return res;
}

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
    return conCsp(NextResponse.redirect(url), pathname);
  }

  // Sesión activa entrando al login -> a su panel.
  if (pathname === "/login" && rol) {
    return conCsp(NextResponse.redirect(aUrl(panelPorRol(rol))), pathname);
  }

  // Ruta protegida de OTRO rol -> a su propio panel.
  if (prefijo && rol && PREFIJO_ROL[prefijo] !== rol) {
    return conCsp(NextResponse.redirect(aUrl(panelPorRol(rol))), pathname);
  }

  return conCsp(NextResponse.next(), pathname);
});

// El proxy corre en TODAS las rutas de documento para poder emitir la CSP en un
// único lugar. Se excluyen /api (respuestas no-HTML con sus propias cabeceras),
// los estáticos de Next, el optimizador de imágenes, el favicon y /imgly (chunks
// del modelo ~40MB: no necesitan CSP ni el costo de decodificar el JWT).
export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|imgly).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
