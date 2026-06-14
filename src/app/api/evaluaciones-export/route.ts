import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { exportarEvaluaciones } from "@/services/export-evaluaciones.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga el reporte de evaluaciones/OVR de todos los jugadores de la escuela
 * en Excel. Solo ESCUELA_ADMIN y SUPER_ADMIN. El servicio aplica rol/tenant.
 *
 * Uso: GET /api/evaluaciones-export
 *      GET /api/evaluaciones-export?escuelaId=<id>   (SUPER_ADMIN)
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  const escuelaId =
    new URL(req.url).searchParams.get("escuelaId") ?? undefined;
  try {
    const { filename, buffer } = await exportarEvaluaciones(ctx, escuelaId);
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
