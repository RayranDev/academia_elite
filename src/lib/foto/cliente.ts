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
    // Usamos PNG para preservar al 100% la transparencia en todos los navegadores
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Recorta el área seleccionada (en píxeles de la imagen mostrada) y devuelve un
 * Blob PNG optimizado (lado mayor ≤ `maxLado`).
 */
export async function recortarABlob(
  src: string,
  area: AreaPixels,
  maxLado = 800,
  _calidad = 0.85,
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
      "image/png",
    );
  });
}

export async function removerFondoDeImagen(src: string): Promise<string> {
  try {
    const { removeBackground } = await import("@imgly/background-removal");
    
    // Convertimos la dataURL en un Blob para procesarlo
    const res = await fetch(src);
    const blob = await res.blob();
    
    // Removemos el fondo
    const processedBlob = await removeBackground(blob);
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          resolve(src);
        }
      };
      reader.onerror = () => resolve(src);
      reader.readAsDataURL(processedBlob);
    });
  } catch (err) {
    console.error("Error al remover fondo con @imgly/background-removal:", err);
    return src; // Fallback al original si falla
  }
}
