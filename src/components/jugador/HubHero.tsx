"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { PlayerCard } from "@/components/cards/PlayerCard";
import type { PlayerCardData } from "@/types";

/**
 * Carta protagonista del hub: revelación con count-up y un estallido de confetti
 * al entrar (una vez), salvo prefers-reduced-motion.
 */
export function HubHero({ card }: { card: PlayerCardData }) {
  const disparado = useRef(false);

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

  return (
    <div className="flex justify-center perspective-[1000px]">
      <PlayerCard data={card} size="hero" interactive reveal />
    </div>
  );
}
