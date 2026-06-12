"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { editarEscuelaAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function EscuelaEditarForm({
  escuela,
}: {
  escuela: { id: string; nombre: string; slug: string; colorPrimario: string; activa: boolean };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await editarEscuelaAction(prev, fd);
      if (res.ok) router.refresh();
      return res;
    },
    undefined,
  );

  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">Datos de la escuela</h2>
      <form action={action} className="space-y-3">
        <input type="hidden" name="escuelaId" value={escuela.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Nombre</label>
            <input name="nombre" defaultValue={escuela.nombre} required className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Slug</label>
            <input name="slug" defaultValue={escuela.slug} required className={input} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Color primario</label>
            <input
              name="colorPrimario"
              type="color"
              defaultValue={escuela.colorPrimario}
              className="h-10 w-16 cursor-pointer rounded-lg border border-subtle bg-surface-2"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              name="activa"
              defaultChecked={escuela.activa}
              className="accent-[color:var(--brand)]"
            />
            Escuela activa
          </label>
        </div>
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
        )}
        {state?.ok && <p className="text-sm text-brand">Cambios guardados.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </Card>
  );
}
