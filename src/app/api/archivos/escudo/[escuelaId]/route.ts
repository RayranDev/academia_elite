import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { leerFoto } from "@/lib/foto/storage";

const NO_ENCONTRADA = () => new NextResponse(null, { status: 404 });

/**
 * Sirve el escudo (PNG) de una escuela. Requiere sesión; solo del mismo tenant
 * o SUPER_ADMIN. No es dato de menores, pero no se expone como estático público.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ escuelaId: string }> },
) {
  const { escuelaId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NO_ENCONTRADA();
  if (ctx.rol !== "SUPER_ADMIN" && ctx.escuelaId !== escuelaId) {
    return NO_ENCONTRADA();
  }

  const escuela = await obtenerEscuela(escuelaId);
  if (!escuela?.logoUrl) return NO_ENCONTRADA();

  const buf = await leerFoto(escuela.logoUrl);
  if (!buf) return NO_ENCONTRADA();

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
    },
  });
}
