import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { exportarMembresias } from "@/services/export-membresias.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga la cobranza (cuotas / mora) en Excel. Escuela (su tenant) o Súper
 * Admin (con `?escuelaId=` y sesión de soporte). Filtros opcionales
 * `?estado=` y `?periodo=`. El servicio aplica rol/tenant y audita la descarga.
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  const sp = new URL(req.url).searchParams;
  try {
    const { filename, buffer } = await exportarMembresias(ctx, {
      escuelaId: sp.get("escuelaId") ?? undefined,
      estado: sp.get("estado") ?? undefined,
      periodo: sp.get("periodo") ?? undefined,
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
