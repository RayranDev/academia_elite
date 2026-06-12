"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { actualizarDtAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { DtDTO } from "@/services/entrenador.service";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function DtEditarDialog({
  dt,
  categorias,
}: {
  dt: DtDTO;
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const asignadas = new Set(dt.categorias.map((c) => c.id));
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await actualizarDtAction(prev, fd);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
      return res;
    },
    undefined,
  );

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
        Editar
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar DT">
        <form action={action} className="space-y-3">
          <input type="hidden" name="entrenadorId" value={dt.id} />
          <div>
            <label className="mb-1 block text-xs text-muted">Nombre</label>
            <input name="nombre" defaultValue={dt.nombre} required className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Categorías asignadas</label>
            <div className="space-y-1 rounded-lg border border-subtle bg-surface-2 p-3">
              {categorias.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="categoriaIds"
                    value={c.id}
                    defaultChecked={asignadas.has(c.id)}
                    className="accent-[color:var(--brand)]"
                  />
                  {c.nombre}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={dt.activo}
              className="accent-[color:var(--brand)]"
            />
            Cuenta activa
          </label>
          {state && !state.ok && (
            <p className="text-sm text-alerta" role="alert">
              {state.error}
            </p>
          )}
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
