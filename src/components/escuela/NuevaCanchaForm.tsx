"use client";

import { crearCanchaAction } from "@/actions/escuela.actions";
import { Button } from "@/components/ui/Button";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Alta de cancha dentro de la tarjeta de una sede. Misma receta que
 * `NuevaSedeForm`: estado de carga, confirmación con el nombre y error visible;
 * el campo se vacía solo al crear.
 */
export function NuevaCanchaForm({ sedeId }: { sedeId: string }) {
  const { enviar, pendiente, resultado, error, limpiar } = useEnvioAccion(
    crearCanchaAction,
    { alExito: (_data, form) => form.reset() },
  );
  const exito =
    resultado?.ok && resultado.data
      ? `Cancha «${resultado.data.nombre}» agregada.`
      : null;

  return (
    <form
      onSubmit={enviar}
      onChange={limpiar}
      className="mt-3 border-t border-subtle pt-3"
    >
      <input type="hidden" name="sedeId" value={sedeId} />
      <div className="flex gap-2">
        <input
          name="nombre"
          placeholder="Nombre de cancha"
          aria-label="Nombre de la cancha"
          required
          className={input}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={pendiente}
          aria-busy={pendiente}
        >
          {pendiente ? "Agregando…" : "+ Cancha"}
        </Button>
      </div>
      <MensajeAccion exito={exito} error={error} reservarAltura={false} className="mt-2" />
    </form>
  );
}
