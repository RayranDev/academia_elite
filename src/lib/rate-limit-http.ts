import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Límite de frecuencia para route handlers: devuelve `null` si la petición
 * pasa, o un 429 listo para retornar (con `Retry-After`) si superó el límite.
 *
 *   const bloqueo = await limitarRuta(`export:${ctx.userId}`, 10, 60_000);
 *   if (bloqueo) return bloqueo;
 *
 * La clave debe ser por usuario autenticado (o por IP en rutas públicas): el
 * costo que protege es CPU + base de datos, no solo ancho de banda.
 */
export async function limitarRuta(
  clave: string,
  limite: number,
  ventanaMs: number,
): Promise<NextResponse | null> {
  const resultado = await rateLimit(clave, limite, ventanaMs);
  if (resultado.ok) return null;
  return new NextResponse(null, {
    status: 429,
    headers: {
      "Retry-After": String(Math.max(1, Math.ceil(resultado.retryAfterMs / 1000))),
      "Cache-Control": "no-store",
    },
  });
}
