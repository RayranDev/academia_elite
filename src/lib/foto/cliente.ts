/**
 * Utilidades de imagen EN EL CLIENTE (usan canvas/Image del navegador).
 * Se importan solo desde Client Components: comprimen y recortan la foto antes
 * de subirla, para no cargar al servidor con imágenes enormes. El servidor
 * vuelve a procesarla (strip EXIF + resize + webp) como defensa en profundidad.
 */

export interface AreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Proporción de la zona de foto de la carta (vertical). */
export const ASPECTO_CARTA = 3 / 4;

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen."));
    img.src = src;
  });
}

/**
 * Redimensiona la imagen elegida (si supera `maxLado`) y la devuelve como
 * dataURL JPEG, lista para mostrarse en el recortador sin agotar memoria.
 */
export async function prepararParaRecorte(file: File, maxLado = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await cargarImagen(url);
    const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * escala));
    const h = Math.max(1, Math.round(img.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible.");
    ctx.drawImage(img, 0, 0, w, h);
    // WebP conserva la transparencia (JPEG la rellenaría de NEGRO). Así un PNG/
    // SVG sin fondo sigue sin fondo durante el recorte y al subir.
    return canvas.toDataURL("image/webp", 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Recorta el área seleccionada (en píxeles de la imagen mostrada) y devuelve un
 * Blob WebP optimizado (lado mayor ≤ `maxLado`).
 */
export async function recortarABlob(
  src: string,
  area: AreaPixels,
  maxLado = 800,
  calidad = 0.85,
): Promise<Blob> {
  const img = await cargarImagen(src);
  const escala = Math.min(1, maxLado / Math.max(area.width, area.height));
  const w = Math.max(1, Math.round(area.width * escala));
  const h = Math.max(1, Math.round(area.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo recortar la imagen."))),
      "image/webp",
      calidad,
    );
  });
}
