"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/cn";
import { CountUp } from "@/components/cards/CountUp";
import { PlayerAvatar } from "@/components/avatar/PlayerAvatar";
import type { PlayerCardData, Nivel } from "@/types";

type Size = "sm" | "md" | "hero";

interface PlayerCardProps {
  data: PlayerCardData;
  size?: Size;
  interactive?: boolean;
  reveal?: boolean;
  className?: string;
}

/** Materiales por nivel (Sección 12.2) — gradientes "luxury" multi-parada. */
const MATERIAL: Record<
  Nivel,
  { bg: string; text: string; ring: string; sheen: boolean; heroe: boolean }
> = {
  BRONCE: {
    bg: "linear-gradient(160deg,#8a6134 0%,#c89a62 28%,#7a5527 52%,#a87f47 76%,#56401f 100%)",
    text: "#f6e9d8",
    ring: "#e0bd8d",
    sheen: false,
    heroe: false,
  },
  PLATA: {
    bg: "linear-gradient(160deg,#8e9aab 0%,#eef3f8 28%,#9aa6b6 52%,#d4dde7 76%,#76828f 100%)",
    text: "#1b2433",
    ring: "#ffffff",
    sheen: false,
    heroe: false,
  },
  ORO: {
    bg: "linear-gradient(160deg,#b88a1d 0%,#f7d558 26%,#c89b25 50%,#ffe98c 74%,#8f6b12 100%)",
    text: "#3a2c05",
    ring: "#ffe9a8",
    sheen: true,
    heroe: false,
  },
  HEROE: {
    bg: "linear-gradient(120deg,#6d4cdf 0%,#a78bfa 30%,#f0abfc 55%,#8b5cf6 78%,#6d4cdf 100%)",
    text: "#1a0f2e",
    ring: "#f5d0ff",
    sheen: true,
    heroe: true,
  },
};

const SIZE: Record<
  Size,
  { w: string; name: string; ovr: string; stat: string; seal: string }
> = {
  sm: { w: "w-32", name: "text-[10px]", ovr: "text-2xl", stat: "text-[11px]", seal: "w-7 text-[10px]" },
  md: { w: "w-48", name: "text-sm", ovr: "text-4xl", stat: "text-sm", seal: "w-9 text-xs" },
  hero: { w: "w-72 sm:w-80 max-w-[82vw]", name: "text-xl", ovr: "text-6xl", stat: "text-base", seal: "w-12 text-lg" },
};

const STAT_LABELS: [keyof PlayerCardData["stats"], string][] = [
  ["rit", "RIT"],
  ["tir", "TIR"],
  ["pas", "PAS"],
  ["reg", "REG"],
  ["def", "DEF"],
  ["fis", "FIS"],
];

// Máscara que funde la foto con el material. Centrada algo más arriba y más
// alta para NO recortar la parte superior de la cabeza.
const FOTO_MASK =
  "radial-gradient(ellipse 82% 96% at 50% 36%, #000 62%, transparent 100%)";

// Grano "gold foil": ruido fractal SVG inline (sin assets externos).
const FOIL_GRANO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

// Reflejos metálicos fijos (conic) + veta de lujo diagonal.
const FOIL_REFLEJOS = [
  "conic-gradient(from 215deg at 50% 28%, transparent 0deg, rgba(255,255,255,0.22) 40deg, transparent 85deg, rgba(255,255,255,0.08) 150deg, transparent 210deg, rgba(255,255,255,0.18) 285deg, transparent 340deg)",
  "linear-gradient(115deg, rgba(255,255,255,0.14) 0%, transparent 28%, rgba(255,255,255,0.07) 55%, transparent 78%)",
].join(",");

// Destellos del nivel Héroe (puntos de luz que pulsan).
const SPARKLES = [
  "radial-gradient(circle at 16% 24%, rgba(255,255,255,0.95) 0 1.4px, transparent 3px)",
  "radial-gradient(circle at 74% 12%, rgba(255,255,255,0.9) 0 1.1px, transparent 2.6px)",
  "radial-gradient(circle at 86% 46%, rgba(255,255,255,0.85) 0 1.2px, transparent 2.8px)",
  "radial-gradient(circle at 30% 64%, rgba(255,255,255,0.8) 0 1px, transparent 2.4px)",
  "radial-gradient(circle at 58% 36%, rgba(255,255,255,0.9) 0 1.3px, transparent 3px)",
].join(",");

/** Nombre y apellido en líneas separadas; si no hay apellido, parte el nombre. */
function lineasNombre(data: PlayerCardData): [string, string | null] {
  if (data.apellido) return [data.nombre, data.apellido];
  const i = data.nombre.indexOf(" ");
  if (i > 0) return [data.nombre.slice(0, i), data.nombre.slice(i + 1)];
  return [data.nombre, null];
}

export function PlayerCard({
  data,
  size = "md",
  interactive = false,
  reveal = false,
  className,
}: PlayerCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // El marco de nivel se asigna automáticamente por OVR, pero el morado de
  // Héroe es un fondo ESPECIAL: solo aplica si está desbloqueado y equipado;
  // si no, la carta de un OVR de Héroe se muestra con el marco Oro.
  const nivelVisual: Nivel = data.nivel === "HEROE" && !data.heroeEquipado ? "ORO" : data.nivel;
  const material = MATERIAL[nivelVisual];
  const s = SIZE[size];
  const enableTilt = interactive && !reduce;
  const animarMaterial = size === "hero"; // efectos animados solo en la carta protagonista
  const foil = size !== "sm"; // textura/reflejos premium (estáticos) en md y hero
  const [linea1, linea2] = lineasNombre(data);
  const seedAvatar = `${data.nombre} ${data.apellido ?? ""}`.trim();

  // Tilt 3D + brillo holográfico que sigue el cursor.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotX = useSpring(useTransform(py, [0, 1], [10, -10]), { stiffness: 200, damping: 20 });
  const rotY = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 200, damping: 20 });
  const holoX = useTransform(px, [0, 1], ["0%", "100%"]);
  const holoY = useTransform(py, [0, 1], ["0%", "100%"]);
  const holoBg = useTransform(
    [holoX, holoY] as const,
    ([x, y]: string[]) =>
      `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.5), transparent 42%)`,
  );

  function onMove(e: React.MouseEvent) {
    if (!enableTilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={enableTilt ? { rotateX: rotX, rotateY: rotY, transformPerspective: 900 } : undefined}
      className={cn(
        s.w,
        "relative aspect-3/4 select-none rounded-[14px] p-3",
        foil && "[filter:drop-shadow(0_18px_28px_rgba(0,0,0,0.45))]",
        className,
      )}
    >
      {/* Material base */}
      <div
        className={cn("absolute inset-0 rounded-[14px]", animarMaterial && material.heroe && "carta-heroe-anim")}
        style={{
          background: material.bg,
          ...(animarMaterial && material.heroe ? { backgroundSize: "220% 220%", animation: "carta-heroe 7s ease-in-out infinite" } : {}),
        }}
      />
      {foil && (
        <>
          {/* Grano foil (textura metálica) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[14px] mix-blend-overlay"
            style={{ backgroundImage: FOIL_GRANO, backgroundSize: "120px 120px", opacity: 0.4 }}
          />
          {/* Reflejos metálicos + veta de lujo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[14px] mix-blend-screen"
            style={{ background: FOIL_REFLEJOS }}
          />
        </>
      )}
      {/* Bisel: filo de luz arriba, sombra interna abajo, anillo metálico */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[14px]"
        style={{
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 0 0 1px ${material.ring}59, inset 0 -16px 30px rgba(0,0,0,0.30), inset 0 18px 30px rgba(255,255,255,0.08)`,
        }}
      />
      {/* Sheen especular (Oro/Héroe) */}
      {animarMaterial && material.sheen && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[14px] carta-sheen" />
      )}
      {/* Destellos (Héroe) */}
      {animarMaterial && material.heroe && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[14px] carta-sparkle"
          style={{ background: SPARKLES }}
        />
      )}
      {/* Brillo holográfico que sigue el cursor */}
      {enableTilt && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[14px] mix-blend-soft-light"
          style={{ background: holoBg }}
        />
      )}

      <div className="relative flex h-full flex-col" style={{ color: material.text }}>
        {/* Columna derecha: escudo · dorsal · sello MEN (no tapa stats) */}
        <div className="absolute right-0 top-0 z-10 flex flex-col items-center gap-1">
          {data.escudoEscuelaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.escudoEscuelaUrl} alt="" className={cn(size === "hero" ? "h-8 w-8" : "h-5 w-5", "object-contain")} />
          )}
          {data.dorsal != null && <div className="text-xs font-bold opacity-80">#{data.dorsal}</div>}
          <div
            className={cn(s.seal, "flex aspect-square items-center justify-center rounded-full text-center")}
            style={{
              background: "rgba(7,11,20,0.88)",
              border: `2px solid ${material.ring}`,
              boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
              color: "#f1f5f9",
            }}
          >
            <div className="leading-none">
              <div className="font-display italic tabular">
                <CountUp value={data.men} reveal={reveal} />
              </div>
              <div className={cn("font-bold tracking-wider opacity-80", size === "sm" ? "text-[6px]" : "text-[8px]")}>MEN</div>
            </div>
          </div>
        </div>

        {/* OVR + posición */}
        <div className="leading-none">
          <div
            className={cn(s.ovr, "font-display italic tabular")}
            style={{ textShadow: "0 1px 0 rgba(255,255,255,0.30), 0 3px 8px rgba(0,0,0,0.25)" }}
          >
            <CountUp value={data.ovr} reveal={reveal} />
          </div>
          <div className="text-xs font-bold tracking-widest opacity-90">{data.posicion}</div>
        </div>

        {/* Retrato: foto fundida al material (máscara) o avatar */}
        <div className="relative mt-1 flex flex-1 items-end justify-center overflow-hidden">
          {/* Fondo desbloqueado por méritos, detrás del jugador. */}
          {data.fondoEstilo && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: data.fondoEstilo, WebkitMaskImage: FOTO_MASK, maskImage: FOTO_MASK }}
            />
          )}
          {data.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.fotoUrl}
              alt={seedAvatar}
              // object-top ancla la cabeza arriba (la foto ya viene recortada 3:4);
              // el contenedor es transparente, el fondo lo pone la carta.
              className="absolute inset-0 h-full w-full bg-transparent object-cover object-top"
              style={{ WebkitMaskImage: FOTO_MASK, maskImage: FOTO_MASK }}
            />
          ) : (
            <PlayerAvatar
              config={data.avatarConfig}
              seed={seedAvatar}
              className={cn("h-auto", size === "hero" ? "w-3/5" : "w-3/4")}
            />
          )}
        </div>

        {/* Nombre y apellido en líneas separadas, nunca truncado */}
        <div
          className={cn(s.name, "break-words text-center font-display italic uppercase leading-[1.08]")}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.18)" }}
        >
          <div>{linea1}</div>
          {linea2 && <div>{linea2}</div>}
        </div>

        {/* Separador metálico + stats a todo el ancho */}
        <div
          aria-hidden
          className="mt-1 h-px w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${material.ring}, transparent)` }}
        />
        {/* 6 columnas: las 6 etiquetas en la 1ª fila y los 6 valores justo
            debajo, alineados por el wrap natural del grid. */}
        <div className={cn(s.stat, "mt-1 grid grid-cols-6 gap-x-1 text-center")}>
          {STAT_LABELS.map(([key, label]) => (
            <span key={`et-${key}`} className="text-[0.8em] font-semibold uppercase opacity-65">
              {label}
            </span>
          ))}
          {STAT_LABELS.map(([key]) => (
            <span key={`val-${key}`} className="tabular font-bold leading-tight">
              <CountUp value={data.stats[key]} reveal={reveal} />
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
