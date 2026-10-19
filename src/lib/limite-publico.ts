import { ipCliente } from "@/lib/ip-cliente";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Tope por IP para visitantes SIN sesión (landing, login, registro, /e/[slug],
 * escaneos de rutas inexistentes…). Cada una de esas visitas ejecuta una función
 * y consulta la base, así que un script que las repite cuesta plata y conexiones
 * aunque no robe nada.
 *
 * 600/min (10 por segundo sostenido) frena a un script de una sola fuente, que
 * pide cientos por segundo, sin castigar a varias familias detrás de la misma IP
 * (wifi de la cancha, CGNAT de operadores móviles). Es la segunda línea: la
 * primera es el Firewall de la plataforma (Vercel / Cloudflare), que corta el
 * tráfico volumétrico ANTES de ejecutar código.
 *
 * Con IP desconocida NO se limita: todos compartirían un balde y bloquearíamos a
 * inocentes por culpa de uno (ver `ipCliente`).
 */
export const LIMITE_PUBLICO_POR_MINUTO = 600;

/** `null` si pasa; una respuesta 429 lista para retornar si excedió el tope. */
export async function excedeLimitePublico(
  headers: Pick<Headers, "get">,
): Promise<Response | null> {
  const ip = ipCliente(headers);
  if (ip === "desconocida") return null;
  const limite = await rateLimit(`publico:${ip}`, LIMITE_PUBLICO_POR_MINUTO, 60_000);
  if (limite.ok) return null;
  return new Response("Demasiadas solicitudes. Probá de nuevo en un momento.", {
    status: 429,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(Math.max(1, Math.ceil(limite.retryAfterMs / 1000))),
      "Cache-Control": "no-store",
    },
  });
}
