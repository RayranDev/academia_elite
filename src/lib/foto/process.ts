import sharp from "sharp";

// Alineado con serverActions.bodySizeLimit (4mb) y el tope duro de Vercel (4.5 MB).
export const MAX_FOTO_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_LADO = 800;

/**
 * Valida el tipo real por *magic bytes* (no por extensión ni Content-Type).
 * Solo JPEG / PNG / WebP. Devuelve el tipo detectado o null.
 */
export function detectarTipoImagen(
  buf: Buffer,
): "jpeg" | "png" | "webp" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "png";
  // WebP: "RIFF"...."WEBP"
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}

/**
 * Procesa la imagen para almacenamiento seguro: redimensiona (máx. 800px),
 * recomprime a WebP y NO copia metadatos (elimina EXIF/geolocalización y
 * cualquier payload incrustado). Devuelve el buffer WebP listo para guardar.
 */
export async function procesarFoto(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .rotate() // respeta orientación EXIF antes de descartar metadatos
    .resize(MAX_LADO, MAX_LADO, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

export const MAX_ESCUDO_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Procesa el escudo de la escuela: solo PNG, máx. 256×256, **conservando
 * transparencia**. Sin metadatos. Dimensiones acotadas para no romper la UI.
 */
export async function procesarEscudo(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .resize(256, 256, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
