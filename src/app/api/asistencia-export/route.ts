import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { exportarAsistencia } from "@/services/export-asistencia.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga la asistencia en Excel como matriz (una hoja por categoría). Escuela
 * (su tenant) o Súper Admin (con `?escuelaId=` y sesión de soporte). El servicio
 * aplica rol/tenant y audita la descarga (datos de menores).
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  const sp = new URL(req.url).searchParams;
  try {
    const { filename, buffer } = await exportarAsistencia(ctx, {
      escuelaId: sp.get("escuelaId") ?? undefined,
    });
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
