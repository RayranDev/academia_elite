import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { exportarResultados } from "@/services/export-resultados.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga los resultados de partidos en Excel (partidos + stats individuales).
 * Escuela (su tenant) o Súper Admin (con `?escuelaId=` y sesión de soporte). El
 * servicio aplica rol/tenant y audita la descarga.
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  const sp = new URL(req.url).searchParams;
  try {
    const { filename, buffer } = await exportarResultados(ctx, {
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
