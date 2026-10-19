import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { limitarRuta } from "@/lib/rate-limit-http";
import { obtenerEscudoEscuela } from "@/services/escudo.service";
import { cabecerasCorsFoto } from "@/lib/foto/cors";

const NO_ENCONTRADA = () => new NextResponse(null, { status: 404 });

/**
 * Sirve el escudo (PNG) de una escuela. Requiere sesión; solo del mismo tenant
 * o SUPER_ADMIN con sesión de soporte de esa escuela. No es dato de menores, pero no se expone como estático público.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ escuelaId: string }> },
) {
  const { escuelaId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NO_ENCONTRADA();
  const bloqueo = await limitarRuta(`escudo:${ctx.userId}`, 300, 60_000);
  if (bloqueo) return bloqueo;

  // Rol/tenant y lectura del archivo viven en el servicio (AGENTS.md §4).
  const buf = await obtenerEscudoEscuela(ctx, escuelaId);
  if (!buf) return NO_ENCONTRADA();

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
      // La carta exporta el escudo a PNG con crossOrigin="anonymous"; solo se
      // refleja el origen propio.
      ...cabecerasCorsFoto(req.headers),
    },
  });
}
