"use client";

import { useActionState } from "react";
import { otorgarLogroDtAction } from "@/actions/logro.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { logroAplicaAPosicion } from "@/lib/logros";
import type { LogroCatalogoDTO } from "@/services/logro.service";
import type { ActionResult } from "@/lib/action-result";

export interface JugadorOtorgable {
  id: string;
  nombre: string;
  apellido: string;
  posicion: string;
  categoriaNombre: string;
}

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Otorga el logro a un jugador de las categorías del DT (respeta posición). */
export function LogroOtorgarModal({
  logro,
  jugadores,
  onClose,
}: {
  logro: LogroCatalogoDTO;
  jugadores: JugadorOtorgable[];
  onClose: (cambio: boolean) => void;
}) {
  const elegibles = jugadores.filter((j) =>
    logroAplicaAPosicion(logro.posicion, j.posicion),
  );
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await otorgarLogroDtAction(prev, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title={`Otorgar: ${logro.nombre}`}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="logroId" value={logro.id} />
        <p className="text-sm text-muted">
          {logro.tipo === "BONUS"
            ? `Bonus +${logro.valorBonus} ${logro.statBonus}: se aplicará en la próxima evaluación del jugador.`
            : "Insignia: aparecerá en la vitrina del jugador."}
        </p>
        {elegibles.length === 0 ? (
          <p className="text-sm text-alerta">
            No tienes jugadores activos de la posición {logro.posicion} en tus categorías.
          </p>
        ) : (
          <div>
            <label className="mb-1 block text-xs text-muted">Jugador</label>
            <select name="jugadorId" required className={input}>
              {elegibles.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.apellido}, {j.nombre} · {j.categoriaNombre} · {j.posicion}
                </option>
              ))}
            </select>
          </div>
        )}
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">{state.error}</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={pending || elegibles.length === 0}>
            {pending ? "Otorgando…" : "Otorgar logro"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
