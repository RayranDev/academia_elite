import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { exportarJugadores } from "@/services/export-jugadores.service";
import { XLSX_MIME } from "@/lib/xlsx";

/**
 * Descarga el total de jugadores en Excel. DT (sus categorías), Escuela (su
 * tenant) o Súper Admin (con `?escuelaId=`). El servicio aplica rol/tenant.
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  const escuelaId = new URL(req.url).searchParams.get("escuelaId") ?? undefined;
  try {
    const { filename, buffer } = await exportarJugadores(ctx, escuelaId);
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
