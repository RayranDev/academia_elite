"use client";

import { useState } from "react";
import { Cronometro } from "./Cronometro";
import { ObservacionSheet } from "./ObservacionSheet";
import { Button } from "@/components/ui/Button";
import type { ConvocadoSesionDTO } from "@/services/sesion.service";

/**
 * Paso 2 en ENTRENAMIENTO (PLAN-UX-DT PR-3 §3.3): cronómetro grande y la grilla
 * de presentes. Tocar a un jugador abre la observación. La lista NO se congela:
 * el botón "Lista" de la barra vuelve al paso 1 cuando llega un rezagado.
 */
export function SesionVivo({
  eventoId,
  inicio,
  presentes,
}: {
  eventoId: string;
  inicio: string | null;
  presentes: ConvocadoSesionDTO[];
}) {
  const [jugador, setJugador] = useState<{ id: string; nombre: string } | null>(
    null,
  );

  return (
    <div className="space-y-5">
      <div className="text-center">
        <Cronometro inicio={inicio} className="text-5xl" />
        <p className="mt-1 text-xs uppercase tracking-widest text-muted">
          {presentes.length} en cancha
        </p>
      </div>

      {presentes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-subtle p-6 text-center text-sm text-muted">
          Nadie marcado como presente todavía. Volvé a la lista para pasarla.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted">
            Tocá un jugador para anotar una observación.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {presentes.map((p) => (
              <Button
                key={p.jugadorId}
                type="button"
                variant="secondary"
                className="min-h-16 flex-col whitespace-normal px-1 text-xs leading-tight"
                onClick={() =>
                  setJugador({ id: p.jugadorId, nombre: p.nombre })
                }
              >
                <span className="font-bold">{p.nombre}</span>
                <span className="opacity-70">{p.apellido}</span>
              </Button>
            ))}
          </div>
        </>
      )}

      <ObservacionSheet
        abierto={jugador !== null}
        onCerrar={() => setJugador(null)}
        eventoId={eventoId}
        jugador={jugador}
      />
    </div>
  );
}
