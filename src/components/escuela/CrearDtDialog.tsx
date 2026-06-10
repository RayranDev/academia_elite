"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { crearDtAction } from "@/actions/escuela.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function CrearDtDialog({
  categorias,
}: {
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult<{ email: string; passwordTemporal: string }> | undefined,
    FormData
  >(crearDtAction, undefined);

  const exito = state?.ok ? state.data : undefined;

  function cerrar() {
    setOpen(false);
    if (exito) router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={categorias.length === 0}>
        + Nuevo DT
      </Button>

      <Modal open={open} onClose={cerrar} title="Nuevo DT">
        {exito ? (
          <div className="space-y-4">
            <p className="text-sm text-brand">✅ DT creado.</p>
            <div className="rounded-lg border border-subtle bg-surface-2 p-4 text-sm">
              <p className="text-muted">Email</p>
              <p className="font-mono font-semibold">{exito.email}</p>
              <p className="mt-3 text-muted">Contraseña temporal</p>
              <p className="select-all font-mono text-lg font-bold text-brand">
                {exito.passwordTemporal}
              </p>
              <p className="mt-3 text-xs text-alerta">
                Cópiala y compártela por un canal seguro. No se volverá a mostrar.
              </p>
            </div>
            <Button className="w-full" onClick={cerrar}>
              Listo
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Nombre</label>
              <input name="nombre" required className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Email</label>
              <input name="email" type="email" required className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">
                Categorías asignadas
              </label>
              <div className="space-y-1 rounded-lg border border-subtle bg-surface-2 p-3">
                {categorias.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="categoriaIds"
                      value={c.id}
                      className="accent-[color:var(--brand)]"
                    />
                    {c.nombre}
                  </label>
                ))}
              </div>
            </div>
            {state && !state.ok && (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? "Creando…" : "Crear DT"}
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
