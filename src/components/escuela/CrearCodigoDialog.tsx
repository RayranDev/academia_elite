"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { crearCodigoAction } from "@/actions/escuela.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function CrearCodigoDialog({
  categorias,
}: {
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult<{ codigo: string }> | undefined,
    FormData
  >(crearCodigoAction, undefined);

  const exito = state?.ok ? state.data : undefined;

  function cerrar() {
    setOpen(false);
    if (exito) router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={categorias.length === 0}>
        + Generar código
      </Button>

      <Modal open={open} onClose={cerrar} title="Generar código de invitación">
        {exito ? (
          <div className="space-y-4">
            <p className="text-sm text-brand">✅ Código generado.</p>
            <div className="rounded-lg border border-subtle bg-surface-2 p-4 text-center">
              <p
                data-testid="codigo-generado"
                className="select-all font-mono text-3xl font-black tracking-widest text-brand"
              >
                {exito.codigo}
              </p>
              <p className="mt-2 text-xs text-muted">
                Compártelo con las familias de la categoría.
              </p>
            </div>
            <Button className="w-full" onClick={cerrar}>
              Listo
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Categoría</label>
              <select name="categoriaId" required className={input}>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Usos máximos</label>
                <input name="usosMaximos" type="number" defaultValue={1} min={1} className={input} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Validez (días)</label>
                <input name="diasValidez" type="number" defaultValue={30} min={1} className={input} />
              </div>
            </div>
            {state && !state.ok && (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? "Generando…" : "Generar"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
