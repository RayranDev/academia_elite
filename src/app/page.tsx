import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch">
        Fútbol Career Mode
      </p>
      <h1 className="max-w-2xl text-4xl font-black italic uppercase leading-tight sm:text-6xl">
        Convierte el esfuerzo en una carta
      </h1>
      <p className="max-w-xl text-muted">
        Plataforma de formación en fútbol base: evaluaciones reales que se
        transforman en una carta con stats, niveles y evolución. La landing
        animada completa llega en el Sprint 1.
      </p>
      <Link href="/login">
        <Button size="lg">Iniciar sesión</Button>
      </Link>
    </main>
  );
}
