"use client";

import { useState } from "react";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { cartaDemo, NIVELES_ORDEN } from "@/lib/demo-card";

/**
 * Demo en vivo: el slider (0–3) recorre los niveles BRONCE → HÉROE y la carta
 * cambia de material y stats en tiempo real. Muestra la promesa del producto:
 * "el esfuerzo sube tu carta".
 */
export function LiveDemo() {
  const [idx, setIdx] = useState(0);
  const nivel = NIVELES_ORDEN[idx];
  const data = cartaDemo(nivel);

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch">
            Demo en vivo
          </p>
          <h2 className="mt-2 text-3xl font-black italic uppercase sm:text-4xl">
            Mueve el deslizador y mira evolucionar la carta
          </h2>
        </div>

        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex justify-center perspective-[1000px]">
            <PlayerCard data={data} size="hero" interactive />
          </div>

          <div>
            <label
              htmlFor="demo-nivel"
              className="mb-2 block text-sm font-medium text-muted"
            >
              Progresión:{" "}
              <span className="font-bold text-foreground">{nivel}</span>
            </label>
            <input
              id="demo-nivel"
              type="range"
              min={0}
              max={NIVELES_ORDEN.length - 1}
              step={1}
              value={idx}
              onChange={(e) => setIdx(Number(e.target.value))}
              className="w-full accent-pitch"
              aria-valuetext={nivel}
            />
            <div className="mt-2 flex justify-between text-xs text-muted">
              {NIVELES_ORDEN.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Row label="OVR" value={data.ovr} />
              <Row label="MEN (mentalidad)" value={data.men} />
              {Object.entries(data.stats).map(([k, v]) => (
                <Row key={k} label={k.toUpperCase()} value={v} />
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between border-b border-subtle py-1">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold tabular">{value}</dd>
    </div>
  );
}
