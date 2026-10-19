"use client";

import { crearSedeAction } from "@/actions/escuela.actions";
import { Button } from "@/components/ui/Button";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Alta de sede con respuesta visible: carga ("Creando…"), éxito con el nombre
 * de la sede creada y error junto al botón. El formulario se limpia solo al
 * crear (se envía con `onSubmit`, no con `<form action>`, para que un error no
 * borre lo escrito: AGENTS.md §5).
 */
export function NuevaSedeForm() {
  const { enviar, pendiente, resultado, error, limpiar } = useEnvioAccion(
    crearSedeAction,
    { alExito: (_data, form) => form.reset() },
  );
  const exito =
    resultado?.ok && resultado.data ? `Sede «${resultado.data.nombre}» creada.` : null;

  return (
    <form onSubmit={enviar} onChange={limpiar} className="space-y-3">
      <div>
        <label htmlFor="sede-nombre" className="mb-1 block text-xs text-muted">
          Nombre
        </label>
        <input
          id="sede-nombre"
          name="nombre"
          placeholder="Sede Central"
          required
          className={input}
        />
      </div>
      <div>
        <label htmlFor="sede-direccion" className="mb-1 block text-xs text-muted">
          Dirección (opcional)
        </label>
        <input id="sede-direccion" name="direccion" className={input} />
      </div>
      <Button type="submit" className="w-full" disabled={pendiente} aria-busy={pendiente}>
        {pendiente ? "Creando…" : "Crear sede"}
      </Button>
      <MensajeAccion exito={exito} error={error} />
    </form>
  );
}
