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
import type { PlayerCardData, Nivel } from "@/types";

type Size = "sm" | "md" | "hero";

interface PlayerCardProps {
  data: PlayerCardData;
  size?: Size;
  interactive?: boolean;
  className?: string;
}

/** Materiales por nivel (Sección 12.2). */
const MATERIAL: Record<Nivel, { bg: string; text: string; ring: string }> = {
  BRONCE: {
    bg: "linear-gradient(150deg,#7c5a33,#b08d57 45%,#5e4424)",
    text: "#f6e9d8",
    ring: "#d8b483",
  },
  PLATA: {
    bg: "linear-gradient(150deg,#9aa6b4,#dfe7ef 45%,#8893a3)",
    text: "#1b2433",
    ring: "#f1f5f9",
  },
  ORO: {
    bg: "linear-gradient(150deg,#caa12f,#f5c542 40%,#a9801c)",
    text: "#3a2c05",
    ring: "#ffe49a",
  },
  HEROE: {
    bg: "linear-gradient(150deg,#a78bfa,#f0abfc 50%,#7c5cf0)",
    text: "#1a0f2e",
    ring: "#f5d0ff",
  },
};

const SIZE: Record<Size, { w: string; name: string; ovr: string; stat: string }> = {
  sm: { w: "w-32", name: "text-sm", ovr: "text-2xl", stat: "text-[11px]" },
  md: { w: "w-48", name: "text-lg", ovr: "text-4xl", stat: "text-sm" },
  hero: { w: "w-80", name: "text-2xl", ovr: "text-6xl", stat: "text-base" },
};

const STAT_LABELS: [keyof PlayerCardData["stats"], string][] = [
  ["rit", "RIT"],
  ["tir", "TIR"],
  ["pas", "PAS"],
  ["reg", "REG"],
  ["def", "DEF"],
  ["fis", "FIS"],
];

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? "";
  const b = partes[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function PlayerCard({
  data,
  size = "md",
  interactive = false,
  className,
}: PlayerCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const material = MATERIAL[data.nivel];
  const s = SIZE[size];
  const enableTilt = interactive && !reduce;

  // Tilt 3D + brillo holográfico que sigue el cursor.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotX = useSpring(useTransform(py, [0, 1], [10, -10]), {
    stiffness: 200,
    damping: 20,
  });
  const rotY = useSpring(useTransform(px, [0, 1], [-10, 10]), {
    stiffness: 200,
    damping: 20,
  });
  const holoX = useTransform(px, [0, 1], ["0%", "100%"]);
  const holoY = useTransform(py, [0, 1], ["0%", "100%"]);
  const holoBg = useTransform(
    [holoX, holoY] as const,
    ([x, y]: string[]) =>
      `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.55), transparent 45%)`,
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
      style={
        enableTilt
          ? { rotateX: rotX, rotateY: rotY, transformPerspective: 900 }
          : undefined
      }
      className={cn(
        s.w,
        "relative aspect-3/4 select-none rounded-[14px] p-4 shadow-2xl shadow-black/40",
        "[clip-path:polygon(0_0,100%_0,100%_88%,88%_100%,0_100%)]",
        className,
      )}
    >
      <div
        className="absolute inset-0 rounded-[14px] [clip-path:polygon(0_0,100%_0,100%_88%,88%_100%,0_100%)]"
        style={{ background: material.bg }}
      />
      {/* brillo holográfico */}
      {enableTilt && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[14px] mix-blend-overlay [clip-path:polygon(0_0,100%_0,100%_88%,88%_100%,0_100%)]"
          style={{ background: holoBg }}
        />
      )}

      <div
        className="relative flex h-full flex-col"
        style={{ color: material.text }}
      >
        {/* Cabecera: OVR + posición */}
        <div className="flex items-start justify-between">
          <div className="leading-none">
            <div className={cn(s.ovr, "font-black italic tabular")}>
              {data.ovr}
            </div>
            <div className="text-xs font-bold tracking-widest opacity-90">
              {data.posicion}
            </div>
          </div>
          {data.dorsal != null && (
            <div className="text-xs font-bold opacity-80">#{data.dorsal}</div>
          )}
        </div>

        {/* Retrato o avatar */}
        <div className="mt-1 flex flex-1 items-center justify-center">
          {data.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.fotoUrl}
              alt={data.nombre}
              className="max-h-[55%] w-auto object-contain drop-shadow-lg"
            />
          ) : (
            <div
              className="flex aspect-square w-1/2 items-center justify-center rounded-full font-black italic"
              style={{
                background: "rgba(0,0,0,0.18)",
                border: `2px solid ${material.ring}`,
              }}
            >
              <span className={size === "hero" ? "text-3xl" : "text-xl"}>
                {iniciales(data.nombre)}
              </span>
            </div>
          )}
        </div>

        {/* Nombre */}
        <div
          className={cn(
            s.name,
            "truncate text-center font-black italic uppercase",
          )}
        >
          {data.nombre}
        </div>

        {/* Stats en dos columnas */}
        <div
          className={cn(
            s.stat,
            "mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 font-semibold",
          )}
          style={{ borderTop: `1px solid ${material.ring}80` }}
        >
          {STAT_LABELS.map(([key, label]) => (
            <div key={key} className="flex justify-between">
              <span className="tabular">{data.stats[key]}</span>
              <span className="opacity-70">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sello MEN circular (marca de la casa) */}
      <div
        className="absolute bottom-1.5 right-1.5 flex aspect-square items-center justify-center rounded-full text-center"
        style={{
          width: size === "hero" ? "3.25rem" : size === "md" ? "2.25rem" : "1.6rem",
          background: "rgba(7,11,20,0.85)",
          border: `2px solid ${material.ring}`,
          color: "#f1f5f9",
        }}
      >
        <div className="leading-none">
          <div
            className={cn(
              "font-black italic tabular",
              size === "hero" ? "text-xl" : size === "md" ? "text-sm" : "text-[10px]",
            )}
          >
            {data.men}
          </div>
          <div
            className={cn(
              "font-bold tracking-wider opacity-80",
              size === "sm" ? "text-[6px]" : "text-[8px]",
            )}
          >
            MEN
          </div>
        </div>
      </div>
    </motion.div>
  );
}
