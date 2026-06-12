import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { generarPlantillaEvaluaciones } from "@/services/importacion-evaluaciones.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga la plantilla .xlsx de la jornada de medición (solo DT). El servicio
 * aplica el scoping por categorías del DT.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  try {
    const { filename, buffer } = await generarPlantillaEvaluaciones(ctx);
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
