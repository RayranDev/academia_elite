"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearEventoAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TIPOS_EVENTO } from "@/types";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  categoriaId: string;
}

export function CrearEventoDialog({
  categorias,
  jugadores,
}: {
  categorias: { id: string; nombre: string }[];
  jugadores: Jugador[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("ENTRENAMIENTO");
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await crearEventoAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const convocables = jugadores.filter((j) => j.categoriaId === categoriaId);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={categorias.length === 0}>
        + Nuevo evento
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo evento">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Tipo</label>
              <select
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className={input}
              >
                {TIPOS_EVENTO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Categoría</label>
              <select
                name="categoriaId"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className={input}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Título</label>
            <input name="titulo" required className={input} placeholder={tipo === "PARTIDO" ? "vs. Academia Sur" : "Entrenamiento técnico"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Inicio</label>
              <input name="inicio" type="datetime-local" required className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Fin</label>
              <input name="fin" type="datetime-local" required className={input} />
            </div>
          </div>

          {tipo === "PARTIDO" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">Rival</label>
                  <input name="rival" className={input} />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" name="esLocal" className="accent-[color:var(--brand)]" />
                  Local
                </label>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Convocados</label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-subtle bg-surface-2 p-2">
                  {convocables.length === 0 ? (
                    <p className="text-xs text-muted">No hay jugadores en esta categoría.</p>
                  ) : (
                    convocables.map((j) => (
                      <label key={j.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="convocados" value={j.id} className="accent-[color:var(--brand)]" />
                        {j.nombre} {j.apellido}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {tipo !== "PARTIDO" && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="repetirSemanal" className="accent-[color:var(--brand)]" />
                Repetir semanal hasta
              </label>
              <input name="repetirHasta" type="date" className={`${input} w-auto`} />
            </div>
          )}

          {error && <p className="text-sm text-alerta">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Creando…" : "Crear evento"}
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
