"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { Button } from "@/components/ui/Button";
import type { PlayerCardData } from "@/types";

// Marca de agua que se inyecta SOLO en la imagen descargada (no en la web).
const MARCA_AGUA = "Academia Elite — Donde nacen las estrellas";
const WEB = "academia-elite.app";

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

  async function descargar() {
    if (!cartaRef.current) return;
    setError(null);
    setExportando(true); // muestra la marca de agua antes de capturar
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const dataUrl = await toPng(cartaRef.current, { pixelRatio: 2, cacheBust: true });
      const nombre =
        `${card.nombre}-${card.apellido ?? ""}`.trim().replace(/\s+/g, "_") || "carta";
      const a = document.createElement("a");
      a.download = `carta-${nombre}.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      setError("No se pudo generar la imagen. Inténtalo de nuevo.");
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
          <PlayerCard data={card} size="hero" interactive reveal />
        </div>
        {/* Se MONTA solo durante la exportación (opaca, sin transición) para que
            html-to-image la capture; no se ve en la web. */}
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
      <Button variant="secondary" size="sm" onClick={descargar} disabled={exportando}>
        <Download className="mr-1 h-4 w-4" aria-hidden />
        {exportando ? "Generando…" : "Descargar carta"}
      </Button>
      {error && <p className="text-sm text-alerta">{error}</p>}
    </div>
  );
}
