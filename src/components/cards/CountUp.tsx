"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Cuenta ascendente de un número. Con reveal=false muestra el valor final.
 * Respeta prefers-reduced-motion (salta al valor sin animar).
 */
export function CountUp({
  value,
  reveal = false,
  duration = 0.9,
}: {
  value: number;
  reveal?: boolean;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reveal ? 0 : value);

  useEffect(() => {
    if (!reveal) {
      return;
    }
    const controls = animate(0, value, {
      duration: reduce ? 0 : duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reveal, reduce, duration]);

  return <>{display}</>;
}
