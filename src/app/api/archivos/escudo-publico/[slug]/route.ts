import { NextResponse } from "next/server";
import { obtenerEscudoPublico } from "@/services/landing.service";
import { ipCliente } from "@/lib/ip-cliente";
import { rateLimit } from "@/lib/rate-limit";

const NO_ENCONTRADA = () => new NextResponse(null, { status: 404 });

/**
 * Sirve el escudo de una escuela para su landing pública (`/e/[slug]`), SIN
 * sesión: es la marca que la propia escuela decide mostrar públicamente, no
 * dato de menores (a diferencia de `/api/archivos/foto/[jugadorId]`, que nunca
 * es público). Distinto del escudo autenticado (`/api/archivos/escudo/[escuelaId]`,
 * usado dentro de los paneles): ese exige sesión + mismo tenant; este se sirve
 * por slug para un visitante anónimo.
 *
 * La regla de visibilidad (escuela `activa`) vive en `obtenerEscudoPublico`,
 * junto a la de `obtenerLandingPublica`: una sola fuente de verdad.
 *
 * Rate limit generoso (60/min por IP): `rateLimit` es una consulta a Redis (o
 * al fallback en memoria), no una escritura a la base — no le suma costo al
 * lookup que protege. Sirve solo para frenar un scraping evidente, no para
 * uso normal de la landing (imagen cacheada por el navegador + `max-age=300`).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = ipCliente(req.headers);
  const limite = await rateLimit(`escudo-publico:${ip}`, 60, 60 * 1000);
  if (!limite.ok) return new NextResponse(null, { status: 429 });

  const { slug } = await params;
  const buf = await obtenerEscudoPublico(slug);
  if (!buf) return NO_ENCONTRADA();

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
