"use client";

import { useActionState } from "react";
import { configurarLogroDtAction } from "@/actions/logro.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { LogroCatalogoDTO } from "@/services/logro.service";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Activación y ventana programada (desde/hasta) del logro para la escuela. */
export function LogroVentanaModal({
  logro,
  onClose,
}: {
  logro: LogroCatalogoDTO;
  onClose: (cambio: boolean) => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await configurarLogroDtAction(prev, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title={`Programar: ${logro.nombre}`}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="logroId" value={logro.id} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={logro.escuelaActivo ?? true}
            className="accent-[color:var(--brand)]"
          />
          Disponible para mi escuela
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Desde (opcional)</label>
            <input
              name="desde"
              type="date"
              defaultValue={logro.desde ? logro.desde.slice(0, 10) : ""}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Hasta (opcional)</label>
            <input
              name="hasta"
              type="date"
              defaultValue={logro.hasta ? logro.hasta.slice(0, 10) : ""}
              className={input}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          Fuera de la ventana el logro no se puede otorgar y sus bonus
          pendientes no se aplican en evaluaciones.
        </p>
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">{state.error}</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
