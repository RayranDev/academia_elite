"use client";

import { actualizarBrandingAction } from "@/actions/escuela.actions";
import { Button } from "@/components/ui/Button";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Nombre, color y frecuencia de evaluación de la escuela. Guardar cambia el
 * acento de TODOS los paneles del tenant y la landing pública, así que el
 * formulario lo confirma explícitamente en vez de recargar sin decir nada. Se
 * envía con `useEnvioAccion`: un error de validación no borra lo escrito.
 */
export function BrandingForm({
  nombre,
  colorPrimario,
  frecuenciaEvaluacionDias,
}: {
  nombre: string;
  colorPrimario: string;
  frecuenciaEvaluacionDias: number;
}) {
  const { enviar, pendiente, exito, error, limpiar } = useEnvioAccion(
    actualizarBrandingAction,
  );

  return (
    <form onSubmit={enviar} onChange={limpiar} className="space-y-4">
      <div>
        <label htmlFor="branding-nombre" className="mb-1 block text-xs text-muted">
          Nombre de la escuela
        </label>
        <input
          id="branding-nombre"
          name="nombre"
          defaultValue={nombre}
          className={input}
        />
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label htmlFor="branding-color" className="mb-1 block text-xs text-muted">
            Color primario
          </label>
          <input
            id="branding-color"
            name="colorPrimario"
            type="color"
            defaultValue={colorPrimario}
            className="h-10 w-20 cursor-pointer rounded border border-subtle bg-surface-2"
          />
        </div>
        <p className="pb-2 text-xs text-muted">
          Actual: <span className="font-mono">{colorPrimario}</span>
        </p>
      </div>

      <div>
        <label htmlFor="branding-frecuencia" className="mb-1 block text-xs text-muted">
          Frecuencia de evaluación (días)
        </label>
        <input
          id="branding-frecuencia"
          name="frecuenciaEvaluacionDias"
          type="number"
          min={1}
          defaultValue={frecuenciaEvaluacionDias}
          className={input}
        />
      </div>

      <div className="space-y-2">
        <Button type="submit" disabled={pendiente} aria-busy={pendiente}>
          {pendiente ? "Guardando…" : "Guardar branding"}
        </Button>
        <MensajeAccion
          exito={
            exito
              ? "Branding guardado. El cambio ya se ve en los paneles y en la landing pública."
              : null
          }
          error={error}
        />
      </div>
    </form>
  );
}
