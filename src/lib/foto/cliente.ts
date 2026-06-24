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

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
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
  rotation = 0,
): Promise<Blob> {
  const img = await cargarImagen(src);
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    img.width,
    img.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas context to center of the image to rotate and draw it
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-img.width / 2, -img.height / 2);

  // Draw rotated image
  ctx.drawImage(img, 0, 0);

  // croppedAreaPixels values are bounding box relative
  const data = ctx.getImageData(
    area.x,
    area.y,
    area.width,
    area.height
  );

  // Set canvas width to final desired crop size
  canvas.width = area.width;
  canvas.height = area.height;

  // Paste image data with offset
  ctx.putImageData(data, 0, 0);

  // Scale the cropped canvas to maxLado if needed
  let finalCanvas = canvas;
  if (Math.max(area.width, area.height) > maxLado) {
    const escala = Math.min(1, maxLado / Math.max(area.width, area.height));
    const w = Math.max(1, Math.round(area.width * escala));
    const h = Math.max(1, Math.round(area.height * escala));
    finalCanvas = document.createElement("canvas");
    finalCanvas.width = w;
    finalCanvas.height = h;
    const finalCtx = finalCanvas.getContext("2d");
    if (finalCtx) {
      finalCtx.drawImage(canvas, 0, 0, area.width, area.height, 0, 0, w, h);
    } else {
      finalCanvas = canvas;
    }
  }

  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
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
