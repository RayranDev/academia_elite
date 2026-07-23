"use client";

import { useState, useTransition } from "react";
import { crearObservacionAction } from "@/actions/sesion.actions";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";

/** Atajos de 1 toque: la observación tiene que salir en segundos, no en minutos. */
const CHIPS = [
  "💪 Gran actitud",
  "🎯 Mejoró el perfil débil",
  "😓 Desconcentrado",
  "🤝 Buen compañero",
];

/**
 * Observación en caliente sobre un jugador (PLAN-UX-DT PR-3 §3.3). El toggle
 * "visible para la familia" arranca APAGADO: por defecto es nota del cuerpo
 * técnico, y compartirla es una decisión consciente.
 */
export function ObservacionSheet({
  abierto,
  onCerrar,
  eventoId,
  jugador,
}: {
  abierto: boolean;
  onCerrar: () => void;
  eventoId: string;
  jugador: { id: string; nombre: string } | null;
}) {
  const [texto, setTexto] = useState("");
  const [visiblePadre, setVisiblePadre] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cerrar() {
    setTexto("");
    setVisiblePadre(false);
    setError(null);
    onCerrar();
  }

  function guardar() {
    if (!jugador || texto.trim().length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await crearObservacionAction({
        jugadorId: jugador.id,
        eventoId,
        texto: texto.trim(),
        visiblePadre,
      });
      if (res.ok) cerrar();
      else setError(res.error);
    });
  }

  return (
    <BottomSheet
      open={abierto && jugador !== null}
      onClose={cerrar}
      title={jugador ? `Observación · ${jugador.nombre}` : "Observación"}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setTexto((t) => (t ? `${t} ${chip}` : chip))}
            className="min-h-11 rounded-full border border-subtle bg-surface-2 px-3 text-sm font-semibold"
          >
            {chip}
          </button>
        ))}
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="¿Qué viste?"
        aria-label="Texto de la observación"
        className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
      />

      <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={visiblePadre}
          onChange={(e) => setVisiblePadre(e.target.checked)}
          className="accent-[color:var(--brand)]"
        />
        Visible para la familia
      </label>

      {error && (
        <p className="mt-2 text-sm text-alerta" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        size="lg"
        className="mt-3 w-full"
        disabled={pending || texto.trim().length === 0}
        onClick={guardar}
      >
        {pending ? "Guardando…" : "Guardar observación"}
      </Button>
    </BottomSheet>
  );
}
