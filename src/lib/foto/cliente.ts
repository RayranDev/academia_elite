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
 * dataURL PNG, lista para mostrarse en el recortador sin agotar memoria. PNG y
 * no JPEG para preservar la transparencia (la remoción de fondo depende de eso).
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

function aRadianes(grados: number) {
  return (grados * Math.PI) / 180;
}

/** Tamaño de la caja contenedora de una imagen tras rotarla `rotacion` grados. */
function tamañoRotado(ancho: number, alto: number, rotacion: number) {
  const rad = aRadianes(rotacion);
  return {
    ancho: Math.abs(Math.cos(rad) * ancho) + Math.abs(Math.sin(rad) * alto),
    alto: Math.abs(Math.sin(rad) * ancho) + Math.abs(Math.cos(rad) * alto),
  };
}

/**
 * Recorta el área seleccionada (en píxeles de la imagen mostrada) y devuelve un
 * Blob PNG optimizado (lado mayor ≤ `maxLado`). Soporta rotación del recorte.
 */
export async function recortarABlob(
  src: string,
  area: AreaPixels,
  maxLado = 800,
  rotacion = 0,
): Promise<Blob> {
  const img = await cargarImagen(src);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");

  const rad = aRadianes(rotacion);
  const { ancho: anchoCaja, alto: altoCaja } = tamañoRotado(
    img.width,
    img.height,
    rotacion,
  );

  // El canvas toma el tamaño de la caja contenedora de la imagen rotada.
  canvas.width = anchoCaja;
  canvas.height = altoCaja;

  // Trasladamos al centro, rotamos y dibujamos la imagen rotada.
  ctx.translate(anchoCaja / 2, altoCaja / 2);
  ctx.rotate(rad);
  ctx.translate(-img.width / 2, -img.height / 2);
  ctx.drawImage(img, 0, 0);

  // El área de recorte viene en coordenadas de la caja contenedora.
  const data = ctx.getImageData(area.x, area.y, area.width, area.height);

  // Reajustamos el canvas al tamaño final del recorte y pegamos los píxeles.
  canvas.width = area.width;
  canvas.height = area.height;
  ctx.putImageData(data, 0, 0);

  // Si el recorte supera maxLado, lo escalamos hacia abajo.
  let canvasFinal = canvas;
  if (Math.max(area.width, area.height) > maxLado) {
    const escala = Math.min(1, maxLado / Math.max(area.width, area.height));
    const w = Math.max(1, Math.round(area.width * escala));
    const h = Math.max(1, Math.round(area.height * escala));
    canvasFinal = document.createElement("canvas");
    canvasFinal.width = w;
    canvasFinal.height = h;
    const ctxFinal = canvasFinal.getContext("2d");
    if (ctxFinal) {
      ctxFinal.drawImage(canvas, 0, 0, area.width, area.height, 0, 0, w, h);
    } else {
      canvasFinal = canvas;
    }
  }

  return new Promise((resolve, reject) => {
    canvasFinal.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo recortar la imagen."))),
      "image/png",
    );
  });
}

/** Convierte una dataURL en Blob sin usar fetch() (evita 'Failed to fetch' en data: URLs). */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Quita el fondo de la imagen 100% en el navegador (modelo self-hosteado).
 * `onEstado` recibe texto legible de progreso (descarga del modelo y procesado)
 * para mostrar un indicador de carga. Si algo falla, devuelve la imagen original.
 */
export async function removerFondoDeImagen(
  src: string,
  onEstado?: (texto: string) => void,
): Promise<string> {
  try {
    const { removeBackground } = await import("@imgly/background-removal");

    // Convertimos la dataURL en un Blob directamente en memoria (sin fetch)
    const blob = dataUrlToBlob(src);

    // Modelo self-hosteado en /imgly/ (mismo origen, sin CDN externo): son
    // fotos de menores y la foto nunca sale del navegador. publicPath debe ser
    // una URL ABSOLUTA (new URL(x, base) exige base absoluta). Modelo "small"
    // (~40 MB, suficiente para una foto que despues se recorta a la carta) y
    // salida PNG para preservar la transparencia.
    const processedBlob = await removeBackground(blob, {
      publicPath: `${window.location.origin}/imgly/`,
      model: "small",
      // CRÍTICO para el CSP: sin esto imgly corre TODO el pipeline en un Web
      // Worker, y ese worker NO hereda el `unsafe-eval` que sí tiene la página
      // /jugador/perfil. El `imageDecode` interno usa eval → el worker lo bloquea
      // y la remoción falla ("El navegador bloqueó el motor de imagen (CSP)").
      // Corriendo en el hilo principal, el eval queda bajo el CSP correcto. Como
      // sin crossOriginIsolated ya era single-thread, no se pierde paralelismo
      // real; solo se procesa en el hilo principal (unos segundos, con spinner).
      proxyToWorker: false,
      output: { format: "image/png" },
      progress: (key, current, total) => {
        if (!onEstado) return;
        // La primera vez descarga el modelo (lo pesado); luego procesa.
        if (key.startsWith("fetch")) {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          onEstado(`Descargando modelo… ${pct}%`);
        } else {
          onEstado("Quitando el fondo…");
        }
      },
    });

    onEstado?.("Quitando el fondo…");

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
    // Se conserva la foto original (la remoción es una mejora, no un requisito),
    // pero el error SE DEVUELVE: fallar en silencio hacía imposible saber por qué
    // "no funciona" — el usuario veía la foto con fondo y ningún aviso.
    throw new ErrorRemocionFondo(descripcionDeError(err), src);
  }
}

/** Falla de la remoción de fondo, con la foto original para no perder el trabajo. */
export class ErrorRemocionFondo extends Error {
  readonly original: string;
  constructor(mensaje: string, original: string) {
    super(mensaje);
    this.name = "ErrorRemocionFondo";
    this.original = original;
  }
}

/**
 * Traduce el error a algo accionable. Las causas reales son pocas y muy
 * distintas entre sí, así que conviene distinguirlas en vez de mostrar un
 * genérico que no ayuda a nadie a diagnosticar.
 */
function descripcionDeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/unsafe-eval|Content Security Policy|CSP/i.test(msg)) {
    return "El navegador bloqueó el motor de imagen (CSP). Avisá al equipo.";
  }
  if (/fetch|network|Failed to fetch|404/i.test(msg)) {
    return "No se pudo descargar el modelo de imagen. Revisá tu conexión y probá de nuevo.";
  }
  if (/memory|allocation|out of memory/i.test(msg)) {
    return "El dispositivo se quedó sin memoria al procesar la foto. Probá con una foto más chica o desde otro dispositivo.";
  }
  if (/SharedArrayBuffer|WebAssembly|wasm/i.test(msg)) {
    return "Tu navegador no soporta el motor de imagen. Probá con Chrome o Edge actualizados.";
  }
  return `No se pudo quitar el fondo (${msg.slice(0, 120)}).`;
}
