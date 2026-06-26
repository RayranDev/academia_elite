import { headers } from "next/headers";

/**
 * Base absoluta del sitio (protocolo + host) tomada del request. Se usa para
 * construir enlaces en correos (recuperación, verificación, set-password) que
 * deben ser absolutos. Funciona en Server Actions y route handlers, donde existe
 * contexto de request. Detrás de proxy (ngrok, Vercel) respeta los headers
 * `x-forwarded-*`.
 */
export async function urlBase(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}
