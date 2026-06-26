"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Download, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { Button } from "@/components/ui/Button";
import type { PlayerCardData } from "@/types";

// Marca de agua que se inyecta SOLO en la imagen descargada (no en la web).
const MARCA_AGUA = "Academia Elite — Donde nacen las estrellas";
const WEB = "academia-elite.app";

/**
 * Carga una imagen del MISMO origen y la devuelve re-encodeada como Data URL PNG.
 *
 * Por qué PNG vía canvas y no fetch+WebP: html-to-image rasteriza la carta en un
 * <foreignObject> SVG, y Safari/iOS NO dibuja imágenes WebP embebidas ahí (la foto
 * sale en blanco). Re-encodeando a PNG con canvas se evita ese bug y se preserva
 * la transparencia. La foto se sirve con `Access-Control-Allow-Origin: *`, así que
 * con `crossOrigin="anonymous"` el canvas no queda "tainted" y `toDataURL` funciona.
 */
function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = url;
  });
}

async function urlToPngDataUrl(url: string): Promise<string> {
  const img = await cargarImagen(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 1;
  canvas.height = img.naturalHeight || 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Convierte una Data URL en Blob sin usar fetch() (fetch de data: falla en Safari). */
function dataUrlABlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Espera a que todas las <img> del nodo terminen de cargar/decodificar. */
async function esperarImagenes(nodo: HTMLElement | null): Promise<void> {
  if (!nodo) return;
  const imgs = Array.from(nodo.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? img.decode().catch(() => undefined)
        : new Promise<void>((res) => {
            img.addEventListener("load", () => res(), { once: true });
            img.addEventListener("error", () => res(), { once: true });
          }),
    ),
  );
}

/**
 * Carta protagonista del hub: revelación con count-up y confetti al entrar.
 * Incluye "Descargar carta": exporta la carta a PNG inyectando la marca de agua
 * (solo visible en el archivo descargado, nunca en la web).
 */
export function HubHero({ card }: { card: PlayerCardData }) {
  const disparado = useRef(false);
  const cartaRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardConDataUrls, setCardConDataUrls] = useState<PlayerCardData>(card);
  const [prevCard, setPrevCard] = useState<PlayerCardData>(card);

  // Reiniciamos el estado de forma síncrona si llega una carta nueva (evita
  // parpadeos). PlayerCardData no tiene id: comparamos por referencia, que
  // cambia solo cuando el server vuelve a emitir la carta (p. ej. tras subir
  // una foto y hacer router.refresh()).
  if (card !== prevCard) {
    setPrevCard(card);
    setCardConDataUrls(card);
  }

  // Convierte las imágenes a Data URLs para evitar bloqueos de CORS,
  // cookies ausentes o lienzos sucios (tainted canvas) al generar el PNG.
  const obtenerCardConDataUrls = useCallback(async (): Promise<PlayerCardData> => {
    let fotoDataUrl = card.fotoUrl;
    let escudoDataUrl = card.escudoEscuelaUrl;

    if (card.fotoUrl && !card.fotoUrl.startsWith("data:")) {
      try {
        fotoDataUrl = await urlToPngDataUrl(card.fotoUrl);
      } catch (e) {
        console.error("Fallo al pre-cargar foto para descarga:", e);
      }
    }

    if (card.escudoEscuelaUrl && !card.escudoEscuelaUrl.startsWith("data:")) {
      try {
        escudoDataUrl = await urlToPngDataUrl(card.escudoEscuelaUrl);
      } catch (e) {
        console.error("Fallo al pre-cargar escudo para descarga:", e);
      }
    }

    return {
      ...card,
      fotoUrl: fotoDataUrl,
      escudoEscuelaUrl: escudoDataUrl,
    };
  }, [card]);

  // Pre-carga asíncrona al montar o cambiar de carta
  useEffect(() => {
    let activo = true;

    async function precargar() {
      const lista = await obtenerCardConDataUrls();
      if (activo) {
        setCardConDataUrls(lista);
      }
    }

    precargar();
    return () => {
      activo = false;
    };
  }, [card, obtenerCardConDataUrls]);

  useEffect(() => {
    if (disparado.current) return;
    disparado.current = true;
    const prefiereReducir = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!prefiereReducir) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
    }
  }, []);

  /** Captura la carta a PNG (con la marca de agua visible solo en la imagen). */
  async function capturarPng(): Promise<string> {
    setExportando(true); // muestra la marca de agua antes de capturar
    const cardListilla = await obtenerCardConDataUrls();
    setCardConDataUrls(cardListilla);

    // Esperamos a que React pinte los nuevos src (data URLs) y a que las
    // imágenes decodifiquen; si capturamos antes, la foto sale en blanco.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await esperarImagenes(cartaRef.current);

    // html-to-image NO rasteriza el mask-image (radial-gradient) dentro del
    // foreignObject de Chrome: la foto enmascarada DESAPARECE del PNG aunque se
    // vea en pantalla (por eso salía la carta sin la foto). La quitamos solo
    // durante la captura y la restauramos al terminar.
    const fotoImg = cartaRef.current?.querySelector<HTMLElement>(
      "img[data-foto-carta]",
    );
    const maskPrevio = fotoImg
      ? { webkit: fotoImg.style.webkitMaskImage, estandar: fotoImg.style.maskImage }
      : null;
    if (fotoImg) {
      fotoImg.style.webkitMaskImage = "none";
      fotoImg.style.maskImage = "none";
    }
    try {
      // Resolución objetivo ~HD: subimos el pixelRatio para que la carta salga
      // nítida. Texto, sellos y degradados son vectoriales (escalan perfecto); la
      // foto se ve a ~su máximo (el server la guarda a 800px). Con una carta de
      // ~320px, ratio 4 ≈ 1280px de ancho (≈1080p en vertical).
      const ancho = cartaRef.current!.offsetWidth || 320;
      const pixelRatio = Math.min(4, Math.max(2, Math.ceil(1080 / ancho)));
      // Sin cacheBust: los src ya son data URLs. La PRIMERA pasada de html-to-image
      // suele omitir imágenes (no espera a que decodifiquen dentro de su clon);
      // hacemos una pasada de calentamiento y devolvemos la segunda, que embebe la
      // foto de forma fiable (antes la descarga salía "a veces" con foto).
      await toPng(cartaRef.current!, { pixelRatio });
      return await toPng(cartaRef.current!, { pixelRatio });
    } finally {
      if (fotoImg && maskPrevio) {
        fotoImg.style.webkitMaskImage = maskPrevio.webkit;
        fotoImg.style.maskImage = maskPrevio.estandar;
      }
    }
  }

  function nombreArchivo(): string {
    const base =
      `${card.nombre}-${card.apellido ?? ""}`.trim().replace(/\s+/g, "_") || "carta";
    return `carta-${base}.png`;
  }

  function descargarDataUrl(dataUrl: string) {
    const a = document.createElement("a");
    a.download = nombreArchivo();
    a.href = dataUrl;
    a.click();
  }

  function esCancelacion(e: unknown): boolean {
    const err = e as Error;
    const msg = err?.message?.toLowerCase() ?? "";
    return (
      err?.name === "AbortError" ||
      err?.name === "NotAllowedError" ||
      msg.includes("cancel") ||
      msg.includes("abort") ||
      msg.includes("dismiss")
    );
  }

  async function descargar() {
    if (!cartaRef.current) return;
    setError(null);
    try {
      const dataUrl = await capturarPng();
      descargarDataUrl(dataUrl);
    } catch (e) {
      console.error("Error al descargar:", e);
      setError("No se pudo generar la imagen. Inténtalo de nuevo.");
    } finally {
      setExportando(false);
    }
  }

  /**
   * Comparte la carta como imagen. En móvil/SO compatible abre el menú nativo de
   * compartir con el archivo; si no se puede (p. ej. Chrome de escritorio) o falla
   * por algo que no sea una cancelación del usuario, DESCARGA la carta — el botón
   * siempre hace algo útil en vez de mostrar un error.
   */
  async function compartir() {
    if (!cartaRef.current) return;
    setError(null);
    const titulo = `Carta de ${card.nombre}`;

    let dataUrl: string;
    try {
      dataUrl = await capturarPng();
    } catch (e) {
      console.error("Error al generar la carta:", e);
      setError("No se pudo generar la imagen. Inténtalo de nuevo.");
      return;
    } finally {
      setExportando(false);
    }

    // Sin fetch(dataUrl): en Safari/iOS tira "Load failed". Convertimos en memoria.
    const file = new File([dataUrlABlob(dataUrl)], nombreArchivo(), {
      type: "image/png",
    });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: titulo, text: titulo });
        return;
      } catch (e) {
        if (esCancelacion(e)) return; // el usuario cerró el menú: no es un error
        console.warn("Compartir el archivo falló; se descarga la carta:", e);
      }
    }

    // Fallback universal: descargar la imagen (siempre funciona).
    descargarDataUrl(dataUrl);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Mismo wrapper y misma config que la carta de la landing (size hero +
          interactive + perspective) para que se vean idénticas. La marca de agua
          va en una franja DEBAJO de la carta (no encima), por lo que nunca tapa
          los stats. Vive dentro de `cartaRef` para que html-to-image la capture. */}
      <div ref={cartaRef} className="flex flex-col items-center">
        <div className="relative flex justify-center perspective-[1000px]">
          <PlayerCard data={cardConDataUrls} size="hero" interactive reveal />
        </div>
        {/* Se MONTA solo durante la exportación (opaca, sin transición) para que
            html-to-image la capture; no se ve en la web. Colores FIJOS a propósito
            (no tokens de tema): la franja se hornea dentro del PNG descargado y
            debe leerse igual sin importar si la app está en modo claro u oscuro. */}
        {exportando && (
          <div
            aria-hidden
            className="mt-2 w-72 max-w-[82vw] rounded-lg bg-[#0b0f14] px-3 py-2 text-center sm:w-80"
          >
            <p className="text-[11px] font-bold leading-tight text-white">{MARCA_AGUA}</p>
            <p className="text-[10px] leading-tight text-white/70">{WEB}</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={descargar} disabled={exportando}>
          <Download className="mr-1 h-4 w-4" aria-hidden />
          {exportando ? "Generando…" : "Descargar carta"}
        </Button>
        <Button variant="primary" size="sm" onClick={compartir} disabled={exportando}>
          <Share2 className="mr-1 h-4 w-4" aria-hidden />
          Compartir
        </Button>
      </div>
      {error && <p className="text-sm text-alerta">{error}</p>}
    </div>
  );
}
