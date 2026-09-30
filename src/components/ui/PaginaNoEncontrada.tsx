import Link from "next/link";
import { HeroIlustracion } from "@/components/landing/HeroIlustracion";

/**
 * Pantalla 404 de la marca. Se usa en el `not-found` general y en el de la
 * landing pública de la escuela (`/e/[slug]`). El mensaje es el mismo cuando la
 * escuela no existe y cuando está inactiva: no confirmamos cuál de los dos pasó
 * (AGENTS.md §5, el cruce de tenant devuelve 404).
 */
export function PaginaNoEncontrada({
  titulo,
  mensaje,
  etiquetaBoton = "Ir al inicio",
}: {
  titulo: string;
  mensaje: string;
  etiquetaBoton?: string;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-base px-6 py-16">
      <HeroIlustracion
        id="porteria"
        className="pointer-events-none absolute inset-0 h-full w-full text-foreground opacity-[0.12]"
      />
      <div className="relative mx-auto max-w-md text-center">
        <p className="font-display text-7xl italic leading-none text-brand sm:text-8xl" aria-hidden>
          404
        </p>
        <h1 className="mt-4 font-display text-2xl italic uppercase leading-tight sm:text-3xl">
          {titulo}
        </h1>
        <p className="mt-3 text-muted">{mensaje}</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-brand px-6 text-sm font-bold text-overlay transition-opacity hover:opacity-90"
        >
          {etiquetaBoton}
        </Link>
      </div>
    </main>
  );
}
