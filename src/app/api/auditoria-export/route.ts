import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { exportarAuditoria } from "@/services/export-auditoria.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga el AuditLog en Excel. Solo SUPER_ADMIN; opcional `?escuelaId=` para
 * acotar a una escuela. El servicio aplica el guard de rol.
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  const escuelaId = new URL(req.url).searchParams.get("escuelaId") ?? undefined;
  try {
    const { filename, buffer } = await exportarAuditoria(ctx, escuelaId);
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
