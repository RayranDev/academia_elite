import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { generarPlantillaSimulador } from "@/services/plantilla-simulador.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga la planilla de simulación con fórmulas (OVR/MEN). Solo SUPER_ADMIN.
 * `?escuela=<id>` usa los parámetros efectivos de esa escuela; sin él, globales.
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  const escuelaId = new URL(req.url).searchParams.get("escuela") ?? undefined;
  try {
    const { filename, buffer } = await generarPlantillaSimulador(ctx, escuelaId);
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
