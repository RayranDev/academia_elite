"use client";

import { useActionState } from "react";
import { TriangleAlert } from "lucide-react";
import { eliminarJugadorAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { JugadorGestionDTO } from "@/services/gestion-jugadores.service";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Eliminación LÓGICA (solo Súper Admin): exige escribir el nombre completo. */
export function JugadorEliminarModal({
  jugador,
  onClose,
}: {
  jugador: JugadorGestionDTO;
  onClose: (cambio: boolean) => void;
}) {
  const nombreCompleto = `${jugador.nombre} ${jugador.apellido}`;
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await eliminarJugadorAction(prev, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title="Eliminar jugador">
      <form action={action} className="space-y-3">
        <input type="hidden" name="jugadorId" value={jugador.id} />
        <div className="flex items-start gap-2 rounded-lg border border-alerta/40 bg-alerta/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-alerta" aria-hidden />
          <p>
            El jugador desaparecerá de todas las listas (eliminación lógica,
            reversible por el Súper Admin). Sus evaluaciones se conservan.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">
            Escribe <span className="font-mono font-semibold">{nombreCompleto}</span> para confirmar
          </label>
          <input name="confirmacion" required className={input} autoComplete="off" />
        </div>
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
          <Button type="submit" variant="danger" className="flex-1" disabled={pending}>
            {pending ? "Eliminando…" : "Eliminar jugador"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
