"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { Button } from "@/components/ui/Button";
import { cartaDemo } from "@/lib/demo-card";
import { fadeUp, staggerContainer } from "@/lib/motion-presets";

export function Hero() {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : { variants: staggerContainer, initial: "hidden", animate: "visible" };
  const item = reduce ? {} : { variants: fadeUp };

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, var(--color-pitch), transparent 60%)",
        }}
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <motion.div {...anim}>
          <motion.p
            {...item}
            className="text-xs font-bold uppercase tracking-[0.3em] text-pitch"
          >
            Modo Carrera · Fútbol base
          </motion.p>
          <motion.h1
            {...item}
            className="mt-3 text-4xl font-black italic uppercase leading-[0.95] sm:text-6xl"
          >
            Convierte el esfuerzo
            <br />
            en una <span className="text-pitch">carta</span>
          </motion.h1>
          <motion.p {...item} className="mt-5 max-w-md text-muted">
            Evaluaciones físicas, técnicas y de mentalidad reales se transforman
            en una carta con stats 1–99, niveles y evolución histórica. Tu
            academia, gamificada.
          </motion.p>
          <motion.div {...item} className="mt-8 flex gap-3">
            <Link href="#contacto">
              <Button size="lg">Quiero mi academia</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Iniciar sesión
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <div className="flex justify-center perspective-[1000px]">
          <PlayerCard data={cartaDemo("HEROE")} size="hero" interactive />
        </div>
      </div>
    </section>
  );
}
