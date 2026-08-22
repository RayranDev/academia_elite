"use client";

import { useMemo, useState } from "react";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Autocomplete de jugador (C2.2): reemplaza el `<select>` con miles de opciones
 * por un buscador que filtra al escribir. El `id` elegido viaja en un input
 * oculto `jugadorId`, así la action que lo consume no cambia. Filtra sobre la
 * lista ya cargada (para una escuela son cientos, no miles) y muestra hasta 20
 * coincidencias.
 *
 * Extraído de `MembresiasPanel` para reusarlo donde haga falta elegir un
 * jugador de la escuela — el registro de pagos también lo necesita.
 */
export function ComboboxJugador({
  jugadores,
  inputId,
  onElegir,
}: {
  jugadores: { id: string; nombre: string }[];
  inputId?: string;
  /** Se dispara al elegir (o al limpiar, con `null`) — para formularios que reaccionan al jugador. */
  onElegir?: (jugador: { id: string; nombre: string } | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState<{ id: string; nombre: string } | null>(
    null,
  );
  const [abierto, setAbierto] = useState(false);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return jugadores.slice(0, 20);
    return jugadores.filter((j) => j.nombre.toLowerCase().includes(q)).slice(0, 20);
  }, [texto, jugadores]);

  return (
    <div className="relative">
      <input type="hidden" name="jugadorId" value={elegido?.id ?? ""} />
      <input
        id={inputId}
        type="text"
        value={elegido ? elegido.nombre : texto}
        onChange={(e) => {
          setElegido(null);
          onElegir?.(null);
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        // Cierre diferido: deja que el click en una opción se registre primero.
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        placeholder="Busca por nombre o apellido…"
        autoComplete="off"
        className={input}
      />
      {abierto && filtrados.length > 0 && !elegido && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-subtle bg-surface shadow-xl">
          {filtrados.map((j) => (
            <li key={j.id}>
              <button
                type="button"
                onClick={() => {
                  setElegido(j);
                  onElegir?.(j);
                  setTexto("");
                  setAbierto(false);
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
