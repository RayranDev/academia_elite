"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { cartaDemo, NIVELES_ORDEN } from "@/lib/demo-card";
import { colorNivel } from "@/lib/nivel";

const MS_AUTOPLAY = 1500;

/**
 * Demo en vivo: la carta recorre los niveles BRONCE → HÉROE mostrando cómo sube
 * de material y stats. Al entrar en pantalla evoluciona sola (autoplay) para
 * comunicar la promesa "el esfuerzo sube tu carta"; el usuario puede tocar un
 * nivel para fijarlo y tomar el control. Respeta `prefers-reduced-motion`.
 */
export function LiveDemo() {
  const [idx, setIdx] = useState(0);
  const [manual, setManual] = useState(false);
  const [enVista, setEnVista] = useState(false);
  const seccionRef = useRef<HTMLElement>(null);

  const nivel = NIVELES_ORDEN[idx];
  const data = cartaDemo(nivel);
  const ultimo = NIVELES_ORDEN.length - 1;

  // Detecta cuándo la sección está visible para arrancar/pausar el autoplay.
  useEffect(() => {
    const el = seccionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setEnVista(entry.isIntersecting),
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Autoplay: cicla los niveles mientras la sección esté en vista y el usuario
  // no haya tomado el control. No corre si el usuario prefiere menos movimiento.
  useEffect(() => {
    if (manual || !enVista) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setIdx((i) => (i >= ultimo ? 0 : i + 1));
    }, MS_AUTOPLAY);
    return () => clearInterval(t);
  }, [manual, enVista, ultimo]);

  function fijarNivel(i: number) {
    setManual(true);
    setIdx(i);
  }

  return (
    <section ref={seccionRef} className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch">
            Demo en vivo
          </p>
          <h2 className="mt-2 text-3xl font-black italic uppercase sm:text-4xl">
            Mira evolucionar la carta nivel a nivel
          </h2>
        </div>

        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex justify-center perspective-[1000px]">
            <PlayerCard data={data} size="hero" interactive />
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-muted">
              Nivel: <span className="font-bold text-foreground">{nivel}</span>
              {!manual && (
                <span className="ml-2 text-xs text-pitch">· evolucionando ↻</span>
              )}
            </p>

            {/* Selector de niveles: track con 4 nodos clickeables. */}
            <div
              role="group"
              aria-label="Niveles de la carta"
              className="relative px-3"
            >
              {/* línea base + progreso */}
              <div className="absolute inset-x-3 top-3 h-1 -translate-y-1/2 rounded bg-subtle" />
              <div
                className="absolute left-3 top-3 h-1 -translate-y-1/2 rounded bg-pitch transition-all duration-500"
                style={{ width: `calc(${(idx / ultimo) * 100}% - ${(idx / ultimo) * 24}px)` }}
              />
              <div className="relative flex justify-between">
                {NIVELES_ORDEN.map((n, i) => {
                  const activo = i === idx;
                  const alcanzado = i <= idx;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => fijarNivel(i)}
                      aria-pressed={activo}
                      aria-label={`Nivel ${n}`}
                      className="flex flex-col items-center gap-2"
                    >
                      <span
                        className={`h-6 w-6 rounded-full border-2 transition-all ${
                          alcanzado
                            ? "border-pitch bg-pitch"
                            : "border-subtle bg-surface"
                        } ${activo ? "scale-125 ring-2 ring-pitch/40" : ""}`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          activo ? colorNivel(n) : "text-muted"
                        }`}
                      >
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
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
