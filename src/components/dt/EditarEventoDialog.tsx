"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { editarEventoAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Convierte un ISO a valor de <input type="datetime-local"> en hora local. */
function paraInput(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

export function EditarEventoDialog({
  evento,
  canchas,
}: {
  evento: {
    id: string;
    tipo: string;
    titulo: string;
    canchaId: string | null;
    rival: string | null;
    esLocal: boolean | null;
    inicio: string;
    fin: string;
    notas: string | null;
  };
  canchas: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await editarEventoAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Editar
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar evento">
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="eventoId" value={evento.id} />

          <div>
            <label className="mb-1 block text-xs text-muted">Título</label>
            <input name="titulo" required defaultValue={evento.titulo} className={input} />
          </div>

          {canchas.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted">Cancha (opcional)</label>
              <select name="canchaId" defaultValue={evento.canchaId ?? ""} className={input}>
                <option value="">Sin cancha</option>
                {canchas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Inicio</label>
              <input name="inicio" type="datetime-local" required defaultValue={paraInput(evento.inicio)} className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Fin</label>
              <input name="fin" type="datetime-local" required defaultValue={paraInput(evento.fin)} className={input} />
            </div>
          </div>

          {evento.tipo === "PARTIDO" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Rival</label>
                <input name="rival" defaultValue={evento.rival ?? ""} className={input} />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  name="esLocal"
                  defaultChecked={evento.esLocal ?? false}
                  className="accent-[color:var(--brand)]"
                />
                Local
              </label>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted">Notas</label>
            <textarea name="notas" rows={2} defaultValue={evento.notas ?? ""} className={input} />
          </div>

          {error && <p className="text-sm text-alerta">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
