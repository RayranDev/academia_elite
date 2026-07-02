import { NextResponse } from "next/server";

// Endpoint TEMPORAL de diagnóstico (Sprint 8 deploy): verifica que sharp y su
// libvips nativo cargan en el runtime serverless de Vercel. Ejercita una
// operación real para forzar el dlopen de libvips. No expone datos.
// TODO: eliminar una vez confirmado el fix de sharp en producción.
export async function GET() {
  try {
    const sharp = (await import("sharp")).default;
    const buf = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#000000" },
    })
      .webp()
      .toBuffer();
    return NextResponse.json({ ok: true, versions: sharp.versions, bytes: buf.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
