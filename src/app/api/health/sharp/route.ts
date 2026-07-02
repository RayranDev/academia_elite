import { NextResponse } from "next/server";
import sharp from "sharp";

// Endpoint TEMPORAL de diagnóstico (Sprint 8 deploy): verifica que sharp y su
// libvips nativo cargan en el runtime serverless de Vercel. Decodifica un PNG
// 1x1 y lo recomprime a WebP, forzando el dlopen de libvips. No expone datos.
// TODO: eliminar una vez confirmado el fix de sharp en producción.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
  "base64",
);

export async function GET() {
  try {
    const buf = await sharp(PNG_1x1).webp().toBuffer();
    return NextResponse.json({ ok: true, bytes: buf.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
