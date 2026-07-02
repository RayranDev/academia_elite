import { NextResponse } from "next/server";
import sharp from "sharp";

// Endpoint TEMPORAL de diagnóstico (Sprint 8 deploy): verifica que sharp y su
// libvips nativo cargan y PROCESAN en el runtime serverless de Vercel. Genera
// una imagen desde píxeles crudos y la codifica a WebP (fuerza el dlopen de
// libvips + su encoder). No expone datos.
// TODO: eliminar una vez confirmado el fix de sharp en producción.
export async function GET() {
  try {
    // `create` genera un buffer sin decodificar ningún formato de entrada.
    // Tipo estructural mínimo (los .d.ts del paquete están recortados aquí).
    const factory = sharp as unknown as (opts: unknown) => {
      webp(): { toBuffer(): Promise<Buffer> };
    };
    const buf = await factory({
      create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .webp()
      .toBuffer();
    return NextResponse.json({ ok: true, engine: "sharp+libvips", bytes: buf.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
