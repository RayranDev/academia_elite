import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { generarPlantillaJugadores } from "@/services/importacion.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga la plantilla .xlsx de jugadores de una escuela. Requiere sesión:
 * ESCUELA_ADMIN (su tenant) o SUPER_ADMIN (con `?escuelaId=`). El servicio
 * aplica los controles de rol/tenant.
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });

  const escuelaId = new URL(req.url).searchParams.get("escuelaId") ?? undefined;
  try {
    const { filename, buffer } = await generarPlantillaJugadores(ctx, escuelaId);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse(null, { status: 404 });
    throw e;
  }
}
