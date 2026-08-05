"use client";

import { useState, useTransition } from "react";
import { asignarJugadoresDescuentoAction } from "@/actions/descuento.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { DescuentoReglaDTO } from "@/services/descuento.service";

interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  categoriaId: string;
}

/**
 * Checklist de jugadores de la MISMA categoría de la regla, con el patrón
 * `Set<string>` + alternar de `CrearEventoDialog.tsx` (convocados), precargado
 * con los jugadores ya asignados.
 */
export function AsignarJugadoresDescuentoModal({
  regla,
  jugadores,
  asignadosIniciales,
  onClose,
}: {
  regla: DescuentoReglaDTO;
  jugadores: Jugador[];
  asignadosIniciales: string[];
  onClose: (cambio: boolean) => void;
}) {
  const [asignados, setAsignados] = useState<Set<string>>(
    new Set(asignadosIniciales),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function alternar(id: string) {
    setAsignados((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("reglaId", regla.id);
    for (const id of asignados) fd.append("jugadorIds", id);
    startTransition(async () => {
      const res = await asignarJugadoresDescuentoAction(undefined, fd);
      if (res.ok) {
        setError(null);
        onClose(true);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Modal
      open
      onClose={() => onClose(false)}
      title={`Jugadores de "${regla.nombre}"`}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs text-muted">
            Asignados{asignados.size > 0 ? ` (${asignados.size})` : ""}
          </label>
          {jugadores.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <input
                type="checkbox"
                className="accent-[color:var(--brand)]"
                checked={asignados.size === jugadores.length}
                onChange={(e) =>
                  setAsignados(
                    e.target.checked ? new Set(jugadores.map((j) => j.id)) : new Set(),
                  )
                }
              />
              Seleccionar todos
            </label>
          )}
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-subtle bg-surface-2 p-2">
          {jugadores.length === 0 ? (
            <p className="text-xs text-muted">
              No hay jugadores activos en esta categoría.
            </p>
          ) : (
            jugadores.map((j) => (
              <label key={j.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={asignados.has(j.id)}
                  onChange={() => alternar(j.id)}
                  className="accent-[color:var(--brand)]"
                />
                {j.nombre} {j.apellido}
              </label>
            ))
          )}
        </div>
        {error && (
          <p className="text-sm text-alerta" role="alert">{error}</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Guardando…" : "Guardar asignación"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
