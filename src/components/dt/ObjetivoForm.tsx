"use client";

import { useId } from "react";
import { crearObjetivoAction } from "@/actions/dt.actions";
import { Button } from "@/components/ui/Button";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";
import { STATS_OBJETIVO } from "@/types";

const campo =
  "rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Fija una meta de desarrollo. Antes recargaba en silencio: el DT no tenía
 * forma de saber si el objetivo se creó, y con la fecha límite ya cargada podía
 * enviarlo dos veces. Ahora confirma el objetivo creado, limpia la fecha para
 * no reenviarlo por error y, si falla, deja los valores tal cual con el motivo.
 */
export function ObjetivoForm({ jugadorId }: { jugadorId: string }) {
  const idStat = useId();
  const idMeta = useId();
  const idFecha = useId();
  const { enviar, pendiente, resultado, error, limpiar } = useEnvioAccion(
    crearObjetivoAction,
    {
      // Solo la fecha se vacía: es obligatoria y distingue un objetivo del
      // siguiente; stat y meta se conservan por si fija varios seguidos.
      alExito: (_data, form) => {
        const fecha = form.elements.namedItem("fechaLimite");
        if (fecha instanceof HTMLInputElement) fecha.value = "";
      },
    },
  );

  return (
    <form onSubmit={enviar} onChange={limpiar} className="space-y-3">
      <input type="hidden" name="jugadorId" value={jugadorId} />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={idStat} className="mb-1 block text-xs text-muted">
            Stat
          </label>
          <select id={idStat} name="stat" className={campo}>
            {STATS_OBJETIVO.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={idMeta} className="mb-1 block text-xs text-muted">
            Meta
          </label>
          <input
            id={idMeta}
            name="valorMeta"
            type="number"
            min={1}
            max={99}
            defaultValue={75}
            className={`w-20 tabular ${campo}`}
          />
        </div>
        <div>
          <label htmlFor={idFecha} className="mb-1 block text-xs text-muted">
            Fecha límite
          </label>
          <input id={idFecha} name="fechaLimite" type="date" required className={campo} />
        </div>
        <Button type="submit" disabled={pendiente} aria-busy={pendiente}>
          {pendiente ? "Creando…" : "Crear objetivo"}
        </Button>
      </div>
      <MensajeAccion
        exito={resultado?.ok ? "Objetivo creado. La familia lo verá en el hub del jugador." : null}
        error={error}
      />
    </form>
  );
}
