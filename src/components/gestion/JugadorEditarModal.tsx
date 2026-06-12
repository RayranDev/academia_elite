"use client";

import { useActionState } from "react";
import { editarJugadorAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { POSICIONES } from "@/types";
import type { JugadorGestionDTO } from "@/services/gestion-jugadores.service";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function JugadorEditarModal({
  jugador,
  categorias,
  onClose,
}: {
  jugador: JugadorGestionDTO;
  categorias: { id: string; nombre: string }[];
  onClose: (cambio: boolean) => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await editarJugadorAction(prev, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title="Editar jugador">
      <form action={action} className="space-y-3">
        <input type="hidden" name="jugadorId" value={jugador.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Nombre</label>
            <input name="nombre" defaultValue={jugador.nombre} required className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Apellido</label>
            <input name="apellido" defaultValue={jugador.apellido} required className={input} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Fecha de nacimiento</label>
          <input
            name="fechaNacimiento"
            type="date"
            defaultValue={jugador.fechaNacimiento.slice(0, 10)}
            required
            className={input}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Posición</label>
            <select name="posicion" defaultValue={jugador.posicion} className={input}>
              {POSICIONES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Dorsal (opcional)</label>
            <input
              name="dorsal"
              type="number"
              min={1}
              max={99}
              defaultValue={jugador.dorsal ?? ""}
              className={input}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Categoría</label>
          <select name="categoriaId" defaultValue={jugador.categoriaId} className={input}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
