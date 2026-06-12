"use client";

import { useActionState } from "react";
import { cambiarEstadoJugadorAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { JugadorGestionDTO } from "@/services/gestion-jugadores.service";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Inactivar/reactivar con motivo obligatorio (auditado). */
export function JugadorEstadoModal({
  jugador,
  onClose,
}: {
  jugador: JugadorGestionDTO;
  onClose: (cambio: boolean) => void;
}) {
  const reactivar = jugador.estado === "INACTIVO";
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await cambiarEstadoJugadorAction(prev, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal
      open
      onClose={() => onClose(false)}
      title={reactivar ? "Reactivar jugador" : "Inactivar jugador"}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="jugadorId" value={jugador.id} />
        <input type="hidden" name="estado" value={reactivar ? "ACTIVO" : "INACTIVO"} />
        <p className="text-sm text-muted">
          {reactivar
            ? `${jugador.nombre} ${jugador.apellido} volverá a aparecer en la plantilla de su DT.`
            : `${jugador.nombre} ${jugador.apellido} dejará de aparecer en la plantilla (reversible).`}
        </p>
        <div>
          <label className="mb-1 block text-xs text-muted">Motivo (obligatorio)</label>
          <textarea name="motivo" rows={2} required minLength={3} maxLength={200} className={input} />
        </div>
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant={reactivar ? "primary" : "danger"}
            className="flex-1"
            disabled={pending}
          >
            {pending ? "Aplicando…" : reactivar ? "Reactivar" : "Inactivar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
