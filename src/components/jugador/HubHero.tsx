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
 * Convierte una URL a una Data URL en base64 de forma local.
 * Al hacer fetch del propio origen, incluye automáticamente las cookies de sesión.
 */
async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Formato de lectura inválido"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

  // Reiniciamos el estado de forma síncrona si la prop cambia (evita parpadeos y advertencias de useEffect)
  if (card.id !== prevCard.id) {
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
        fotoDataUrl = await urlToDataUrl(card.fotoUrl);
      } catch (e) {
        console.error("Fallo al pre-cargar foto para descarga:", e);
      }
    }

    if (card.escudoEscuelaUrl && !card.escudoEscuelaUrl.startsWith("data:")) {
      try {
        escudoDataUrl = await urlToDataUrl(card.escudoEscuelaUrl);
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

    // Esperamos dos frames para asegurar que React renderice los nuevos src Base64
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return toPng(cartaRef.current!, { pixelRatio: 2, cacheBust: true });
  }

  function nombreArchivo(): string {
    const base =
      `${card.nombre}-${card.apellido ?? ""}`.trim().replace(/\s+/g, "_") || "carta";
    return `carta-${base}.png`;
  }

  async function descargar() {
    if (!cartaRef.current) return;
    setError(null);
    try {
      const dataUrl = await capturarPng();
      const a = document.createElement("a");
      a.download = nombreArchivo();
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error("Error al descargar:", e);
      setError("No se pudo generar la imagen. Inténtalo de nuevo.");
    } finally {
      setExportando(false);
    }
  }

  /** Comparte la carta como imagen (Web Share API); con fallbacks por dispositivo. */
  async function compartir() {
    if (!cartaRef.current) return;
    setError(null);
    const titulo = `Carta de ${card.nombre}`;
    try {
      const dataUrl = await capturarPng();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], nombreArchivo(), { type: "image/png" });
      
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: titulo, text: titulo });
        } else if (navigator.share) {
          await navigator.share({ title: titulo, text: `${titulo} — ${WEB}` });
        } else {
          setError("Tu dispositivo no permite compartir. Usá “Descargar carta”.");
        }
      } catch (shareError) {
        console.error("Fallo al compartir archivo, intentando solo texto:", shareError);
        // Fallback: compartir solo texto/link si falla el archivo
        if (navigator.share) {
          await navigator.share({ title: titulo, text: `${titulo} — ${WEB}` });
        } else {
          throw shareError;
        }
      }
    } catch (e) {
      const err = e as Error;
      // No mostrar error si el usuario simplemente canceló o cerró el diálogo de compartir
      const isCancel =
        err?.name === "AbortError" ||
        err?.name === "NotAllowedError" ||
        err?.message?.toLowerCase().includes("cancel") ||
        err?.message?.toLowerCase().includes("abort") ||
        err?.message?.toLowerCase().includes("dismiss");

      if (!isCancel) {
        console.error("Error al compartir:", e);
        setError("No se pudo compartir. Inténtalo de nuevo.");
      }
    } finally {
      setExportando(false);
    }
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
