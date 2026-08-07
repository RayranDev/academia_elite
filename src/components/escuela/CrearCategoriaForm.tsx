"use client";

import { useActionState } from "react";
import { crearCategoriaAction } from "@/actions/escuela.actions";
import { SelectorAnioCategoria } from "@/components/escuela/SelectorAnioCategoria";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Alta de categoría con feedback inline (`useActionState`): un año mal
 * elegido (ej. "hasta" antes que "desde") muestra el error acá mismo en vez
 * de tirar `ValidationError` al `error.tsx` del segmento.
 */
export function CrearCategoriaForm() {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    crearCategoriaAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-muted">Nombre</label>
        <input name="nombre" placeholder="Sub-14" required className={input} />
      </div>
      <SelectorAnioCategoria />
      {state && !state.ok && (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando…" : "Crear categoría"}
      </Button>
    </form>
  );
}
