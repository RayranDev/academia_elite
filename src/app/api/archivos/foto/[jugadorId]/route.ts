import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { obtenerJugadorParaFoto } from "@/repositories/jugador.repository";
import { esResponsable } from "@/services/foto.service";
import { leerFoto } from "@/lib/foto/storage";

const NO_ENCONTRADA = () => new NextResponse(null, { status: 404 });

/**
 * Sirve la foto del jugador con control de acceso (Sección 6.4). NUNCA es un
 * estático público. Requiere sesión + tenant + (ser responsable O consentimiento
 * vigente siendo del staff de la escuela). Sin permiso → 404 (se muestra avatar).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jugadorId: string }> },
) {
  const { jugadorId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NO_ENCONTRADA();

  const jugador = await obtenerJugadorParaFoto(ctx.escuelaId, jugadorId);
  if (!jugador || !jugador.fotoUrl) return NO_ENCONTRADA();

  // Tenant
  const mismoTenant =
    ctx.rol === "SUPER_ADMIN" || ctx.escuelaId === jugador.escuelaId;
  if (!mismoTenant) return NO_ENCONTRADA();

  // Autorización: el responsable siempre; el staff solo con consentimiento.
  const responsable = esResponsable(ctx, jugador);
  const staffConConsentimiento =
    jugador.consentimientoFoto &&
    (ctx.rol === "DT" ||
      ctx.rol === "ESCUELA_ADMIN" ||
      ctx.rol === "SUPER_ADMIN");
  if (!responsable && !staffConConsentimiento) return NO_ENCONTRADA();

  const buf = await leerFoto(jugador.fotoUrl);
  if (!buf) return NO_ENCONTRADA();

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      // Datos sensibles de menores: nunca cachear en intermediarios.
      "Cache-Control": "private, no-store",
    },
  });
}
