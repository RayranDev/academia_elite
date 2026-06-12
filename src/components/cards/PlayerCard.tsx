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

/** Materiales por nivel (Sección 12.2). */
const MATERIAL: Record<
  Nivel,
  { bg: string; text: string; ring: string; sheen: boolean; heroe: boolean }
> = {
  BRONCE: {
    bg: "linear-gradient(150deg,#7c5a33,#b08d57 45%,#5e4424)",
    text: "#f6e9d8",
    ring: "#d8b483",
    sheen: false,
    heroe: false,
  },
  PLATA: {
    bg: "linear-gradient(150deg,#9aa6b4,#dfe7ef 45%,#8893a3)",
    text: "#1b2433",
    ring: "#f8fafc",
    sheen: false,
    heroe: false,
  },
  ORO: {
    bg: "linear-gradient(150deg,#caa12f,#f5c542 40%,#a9801c)",
    text: "#3a2c05",
    ring: "#ffe49a",
    sheen: true,
    heroe: false,
  },
  HEROE: {
    bg: "linear-gradient(120deg,#7c5cf0,#a78bfa 35%,#f0abfc 70%,#7c5cf0)",
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
  sm: { w: "w-32", name: "text-xs", ovr: "text-2xl", stat: "text-[11px]", seal: "w-7 text-[10px]" },
  md: { w: "w-48", name: "text-base", ovr: "text-4xl", stat: "text-sm", seal: "w-10 text-sm" },
  hero: { w: "w-72 sm:w-80 max-w-[82vw]", name: "text-2xl", ovr: "text-6xl", stat: "text-base", seal: "w-14 text-xl" },
};

const STAT_LABELS: [keyof PlayerCardData["stats"], string][] = [
  ["rit", "RIT"],
  ["tir", "TIR"],
  ["pas", "PAS"],
  ["reg", "REG"],
  ["def", "DEF"],
  ["fis", "FIS"],
];

const CLIP = "[clip-path:polygon(0_0,100%_0,100%_90%,90%_100%,0_100%)]";
const FOTO_MASK =
  "radial-gradient(ellipse 72% 82% at 50% 42%, #000 55%, transparent 100%)";

export function PlayerCard({
  data,
  size = "md",
  interactive = false,
  reveal = false,
  className,
}: PlayerCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const material = MATERIAL[data.nivel];
  const s = SIZE[size];
  const enableTilt = interactive && !reduce;
  const animarMaterial = size === "hero"; // efectos solo en la carta protagonista

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
      className={cn(s.w, "relative aspect-3/4 select-none rounded-[14px] p-3 shadow-2xl shadow-black/40", CLIP, className)}
    >
      {/* Material base */}
      <div
        className={cn("absolute inset-0 rounded-[14px]", CLIP, animarMaterial && material.heroe && "carta-heroe-anim")}
        style={{
          background: material.bg,
          ...(animarMaterial && material.heroe ? { backgroundSize: "220% 220%", animation: "carta-heroe 7s ease-in-out infinite" } : {}),
        }}
      />
      {/* Sheen especular (Oro/Héroe) */}
      {animarMaterial && material.sheen && (
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[14px]", CLIP, "carta-sheen")} />
      )}
      {/* Brillo holográfico que sigue el cursor */}
      {enableTilt && (
        <motion.div
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 rounded-[14px] mix-blend-soft-light", CLIP)}
          style={{ background: holoBg }}
        />
      )}

      <div className="relative flex h-full flex-col" style={{ color: material.text }}>
        {/* Cabecera: OVR + posición · escudo + dorsal */}
        <div className="flex items-start justify-between">
          <div className="leading-none">
            <div className={cn(s.ovr, "font-display italic tabular")}>
              <CountUp value={data.ovr} reveal={reveal} />
            </div>
            <div className="text-xs font-bold tracking-widest opacity-90">{data.posicion}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {data.escudoEscuelaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.escudoEscuelaUrl} alt="" className={cn(size === "hero" ? "h-8 w-8" : "h-5 w-5", "object-contain")} />
            )}
            {data.dorsal != null && <div className="text-xs font-bold opacity-80">#{data.dorsal}</div>}
          </div>
        </div>

        {/* Retrato: foto fundida al material (máscara) o avatar */}
        <div className="relative mt-1 flex flex-1 items-end justify-center overflow-hidden">
          {data.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.fotoUrl}
              alt={data.nombre}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ WebkitMaskImage: FOTO_MASK, maskImage: FOTO_MASK }}
            />
          ) : (
            <PlayerAvatar
              config={data.avatarConfig}
              seed={data.nombre}
              className={cn("h-auto", size === "hero" ? "w-3/4" : "w-4/5")}
            />
          )}
        </div>

        {/* Nombre */}
        <div className={cn(s.name, "truncate text-center font-display italic uppercase")}>{data.nombre}</div>

        {/* Stats (2 columnas) + sello MEN al lado (no se solapan) */}
        <div className="mt-1 flex items-end gap-2" style={{ borderTop: `1px solid ${material.ring}80`, paddingTop: 4 }}>
          <div className={cn(s.stat, "grid flex-1 grid-cols-2 gap-x-3 gap-y-0.5 font-semibold")}>
            {STAT_LABELS.map(([key, label]) => (
              <div key={key} className="flex justify-between">
                <span className="tabular">
                  <CountUp value={data.stats[key]} reveal={reveal} />
                </span>
                <span className="opacity-70">{label}</span>
              </div>
            ))}
          </div>
          {/* Sello MEN (marca de la casa) */}
          <div
            className={cn(s.seal, "flex aspect-square shrink-0 items-center justify-center rounded-full text-center")}
            style={{ background: "rgba(7,11,20,0.88)", border: `2px solid ${material.ring}`, color: "#f1f5f9" }}
          >
            <div className="leading-none">
              <div className="font-display italic tabular">
                <CountUp value={data.men} reveal={reveal} />
              </div>
              <div className={cn("font-bold tracking-wider opacity-80", size === "sm" ? "text-[6px]" : "text-[8px]")}>MEN</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
