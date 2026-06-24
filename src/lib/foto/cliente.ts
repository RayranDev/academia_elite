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

function cargarScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar el script: ${src}`));
    document.body.appendChild(script);
  });
}

interface SelfieSegmentationResults {
  image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;
  segmentationMask: HTMLCanvasElement;
}

interface SelfieSegmentationInstance {
  setOptions: (options: { modelSelection: number }) => void;
  onResults: (callback: (results: SelfieSegmentationResults) => void) => void;
  send: (input: { image: HTMLImageElement }) => Promise<void>;
  close: () => void;
}

interface CustomWindow extends Window {
  SelfieSegmentation: new (options: {
    locateFile: (file: string) => string;
  }) => SelfieSegmentationInstance;
}

/**
 * Procesa una imagen elegida por el usuario para remover su fondo localmente en el cliente
 * mediante MediaPipe Selfie Segmentation, devolviendo una dataURL PNG transparente.
 */
export async function removerFondoDeImagen(src: string): Promise<string> {
  try {
    await cargarScript(
      "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js"
    );
    const win = window as unknown as CustomWindow;
    if (!win.SelfieSegmentation) {
      return src; // Fallback sin cambios si el script no está listo
    }

    const img = await cargarImagen(src);

    return new Promise((resolve) => {
      const segmenter = new win.SelfieSegmentation({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

      segmenter.setOptions({
        modelSelection: 1, // 1 = landscape (más rápido)
      });

      segmenter.onResults((results: SelfieSegmentationResults) => {
        try {
          if (!results.image || !results.segmentationMask) {
            resolve(src);
            segmenter.close();
            return;
          }

          const w = img.width;
          const h = img.height;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(src);
            segmenter.close();
            return;
          }

          ctx.save();
          ctx.clearRect(0, 0, w, h);

          // 1. Dibujar la imagen original
          ctx.drawImage(img, 0, 0, w, h);

          const imgData = ctx.getImageData(0, 0, w, h);

          // 2. Crear un canvas temporal para la máscara
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = w;
          maskCanvas.height = h;
          const maskCtx = maskCanvas.getContext("2d");
          if (maskCtx) {
            maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
            const maskData = maskCtx.getImageData(0, 0, w, h);

            // 3. Transferir el canal rojo de la máscara al alfa de la imagen
            for (let i = 0; i < imgData.data.length; i += 4) {
              imgData.data[i + 3] = maskData.data[i];
            }
            ctx.putImageData(imgData, 0, 0);
          }
          ctx.restore();

          const dataUrl = canvas.toDataURL("image/png");
          resolve(dataUrl);
          segmenter.close();
        } catch (err) {
          console.error("Error procesando remoción de fondo:", err);
          resolve(src);
          segmenter.close();
        }
      });

      segmenter.send({ image: img }).catch((err: unknown) => {
        console.error("Error al enviar imagen al segmentador:", err);
        resolve(src);
        segmenter.close();
      });
    });
  } catch (err) {
    console.error("Error al cargar SelfieSegmentation para archivo:", err);
    return src; // Fallback sin cambios
  }
}
