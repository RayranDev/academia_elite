import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { limitarRuta } from "@/lib/rate-limit-http";
import { obtenerJugadorParaFoto } from "@/repositories/jugador.repository";
import { puedeVerFoto } from "@/lib/foto/permisos";
import { leerFoto } from "@/lib/foto/storage";
import { cabecerasCorsFoto } from "@/lib/foto/cors";

const NO_ENCONTRADA = () => new NextResponse(null, { status: 404 });

/**
 * Sirve la foto del jugador con control de acceso (Sección 6.4). NUNCA es un
 * estático público. Requiere sesión + tenant + (ser responsable O consentimiento
 * vigente siendo del staff de la escuela). Sin permiso → 404 (se muestra avatar).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ jugadorId: string }> },
) {
  const { jugadorId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NO_ENCONTRADA();
  const bloqueo = await limitarRuta(`foto-ver:${ctx.userId}`, 1200, 60_000);
  if (bloqueo) return bloqueo;

  const jugador = await obtenerJugadorParaFoto(ctx.escuelaId, jugadorId);
  if (!jugador || !jugador.fotoUrl) return NO_ENCONTRADA();

  // Tenant + autorización (el SUPER_ADMIN solo con sesión de soporte de esa escuela).
  if (!puedeVerFoto(ctx, jugador)) return NO_ENCONTRADA();

  const buf = await leerFoto(jugador.fotoUrl);
  if (!buf) return NO_ENCONTRADA();

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      // Datos sensibles de menores: nunca cachear en intermediarios.
      "Cache-Control": "private, no-store",
      ...cabecerasCorsFoto(req.headers),
    },
  });
}
