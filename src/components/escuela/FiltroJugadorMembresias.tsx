"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Filtro de jugador para el listado de cuotas: búsqueda-mientras-escribís
 * sobre la lista ya cargada por la página (misma lista que alimenta el
 * combobox de alta, no hace falta un fetch nuevo). A diferencia de
 * `ComboboxJugador` (que setea un input oculto de formulario), acá elegir un
 * jugador navega directo a `?jugadorId=<id>` sin `page` — mismo criterio que
 * las pestañas de estado: cambiar el filtro vuelve a la página 1.
 */
export function FiltroJugadorMembresias({
  jugadores,
  jugadorIdActual,
}: {
  jugadores: { id: string; nombre: string }[];
  jugadorIdActual?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const jugadorActual = jugadores.find((j) => j.id === jugadorIdActual) ?? null;
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return jugadores.slice(0, 20);
    return jugadores.filter((j) => j.nombre.toLowerCase().includes(q)).slice(0, 20);
  }, [texto, jugadores]);

  function navegar(jugadorId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (jugadorId) {
      params.set("jugadorId", jugadorId);
    } else {
      params.delete("jugadorId");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative w-full max-w-xs">
      <input
        type="text"
        value={jugadorActual ? jugadorActual.nombre : texto}
        onChange={(e) => {
          if (jugadorActual) navegar(null);
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        // Cierre diferido: deja que el click en una opción se registre primero.
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        placeholder="Filtrar por jugador…"
        aria-label="Filtrar por jugador"
        autoComplete="off"
        className={input}
      />
      {jugadorActual && (
        <button
          type="button"
          onClick={() => {
            setTexto("");
            navegar(null);
          }}
          aria-label="Quitar filtro de jugador"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground"
        >
          ✕
        </button>
      )}
      {abierto && filtrados.length > 0 && !jugadorActual && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-subtle bg-surface shadow-xl">
          {filtrados.map((j) => (
            <li key={j.id}>
              <button
                type="button"
                onClick={() => {
                  setTexto("");
                  setAbierto(false);
                  navegar(j.id);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                {j.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
