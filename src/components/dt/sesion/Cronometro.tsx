"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

function mmss(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Cronómetro derivado de `sesionIniciadaAt` (del servidor): no guarda estado
 * propio, así que recargar o volver a entrar no lo altera. 100% local: no
 * necesita red, que en cancha es lo primero que falla.
 */
export function Cronometro({
  inicio,
  className,
}: {
  inicio: string | null;
  className?: string;
}) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!inicio) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inicio]);

  if (!inicio) return null;

  return (
    <span className={cn("tabular font-display", className)} aria-live="off">
      {mmss(ahora - new Date(inicio).getTime())}
    </span>
  );
}
