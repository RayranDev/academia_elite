import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { generarPlantillaJugadores } from "@/services/importacion.service";

/**
 * Descarga la plantilla CSV de jugadores de una escuela. Requiere sesión:
 * ESCUELA_ADMIN (su tenant) o SUPER_ADMIN (con `?escuelaId=`). El servicio
 * aplica los controles de rol/tenant.
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });

  const escuelaId = new URL(req.url).searchParams.get("escuelaId") ?? undefined;
  try {
    const { filename, contenido } = await generarPlantillaJugadores(ctx, escuelaId);
    return new NextResponse(contenido, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse(null, { status: 404 });
    throw e;
  }
}
