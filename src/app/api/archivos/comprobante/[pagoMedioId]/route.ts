import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { puedeVerComprobante } from "@/services/pago.service";
import { leerFoto } from "@/lib/foto/storage";

const NO_ENCONTRADO = () => new NextResponse(null, { status: 404 });

/**
 * Sirve el comprobante de pago. NUNCA es un estático público: es un pantallazo
 * de la app del banco, lleva datos de cuenta de la familia. Solo lo ve el tutor
 * que reportó el pago o el ESCUELA_ADMIN del tenant — la verificación de acceso
 * vive en `puedeVerComprobante` (AGENTS.md §5), acá solo se sirve el byte.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pagoMedioId: string }> },
) {
  const { pagoMedioId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NO_ENCONTRADO();

  const acceso = await puedeVerComprobante(ctx, pagoMedioId);
  if (!acceso) return NO_ENCONTRADO();

  const buf = await leerFoto(acceso.comprobanteUrl);
  if (!buf) return NO_ENCONTRADO();

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      // Datos sensibles (cuenta bancaria de la familia): nunca cachear.
      "Cache-Control": "private, no-store",
    },
  });
}
