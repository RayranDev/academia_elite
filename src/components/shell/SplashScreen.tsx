"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const KEY = "fcm-splash";

/**
 * Pantalla de carga estilo videojuego: logo + animación breve al entrar al
 * panel, una sola vez por sesión (sessionStorage). Con prefers-reduced-motion
 * no se muestra. Puramente decorativa: no bloquea datos ni navegación.
 */
export function SplashScreen({ marca }: { marca?: string }) {
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    // setState diferido a callbacks (nunca síncrono dentro del efecto).
    const t0 = setTimeout(() => setVisible(true), 0);
    const t1 = setTimeout(() => setSaliendo(true), 1500);
    const t2 = setTimeout(() => setVisible(false), 2000);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-base transition-opacity duration-500",
        saliendo && "opacity-0",
      )}
    >
      {/* Balón girando */}
      <svg viewBox="0 0 48 48" className="login-ball h-14 w-14" role="img">
        <circle cx="24" cy="24" r="22" fill="#f1f5f9" />
        <polygon points="24,14 33,21 29,31 19,31 15,21" fill="#0d1322" />
        <circle cx="24" cy="24" r="22" fill="none" stroke="var(--brand)" strokeWidth="3" />
      </svg>

      <div className="text-center">
        <p className="font-display text-2xl italic uppercase tracking-wide text-foreground">
          {marca ?? "Fútbol Career Mode"}
        </p>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">
          Career Mode
        </p>
      </div>

      {/* Barra de carga decorativa */}
      <div className="h-1 w-48 overflow-hidden rounded-full bg-subtle">
        <div className="splash-bar h-full rounded-full bg-brand" />
      </div>
    </div>
  );
}
