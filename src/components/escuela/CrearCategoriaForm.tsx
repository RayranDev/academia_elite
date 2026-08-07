"use client";

import { useActionState, useState } from "react";
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
export function CrearCategoriaForm({ anioActual }: { anioActual: number }) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    crearCategoriaAction,
    undefined,
  );

  // React 19 limpia SOLO los campos no controlados del form cuando la action
  // termina: el nombre se vacía, pero el `useState` del checkbox "sin edad"
  // sobrevivía. Quedaba un estado imposible — checkbox destildado y selects de
  // año deshabilitados a la vez — del que solo se salía recargando la página.
  // Remontar el selector con una `key` nueva por cada alta exitosa lo devuelve
  // a su estado inicial, igual que hace React con el resto del formulario.
  const [ultimoResultado, setUltimoResultado] = useState(state);
  const [altas, setAltas] = useState(0);
  if (state !== ultimoResultado) {
    setUltimoResultado(state);
    if (state?.ok) setAltas((n) => n + 1);
  }

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="cat-nombre" className="mb-1 block text-xs text-muted">
          Nombre
        </label>
        <input
          id="cat-nombre"
          name="nombre"
          placeholder="Sub-14"
          required
          className={input}
        />
      </div>
      <SelectorAnioCategoria key={altas} anioActual={anioActual} />
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
