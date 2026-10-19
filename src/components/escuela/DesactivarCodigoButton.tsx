"use client";

import { useState } from "react";
import { desactivarCodigoAction } from "@/actions/escuela.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";

/**
 * Desactivar un código de invitación no se puede deshacer desde el panel (no hay
 * "reactivar"): las familias dejan de poder registrarse con él. Antes salía con
 * un solo toque y sin respuesta; ahora pide confirmar en un modal (mismo patrón
 * que `CancelarEventoButton`), deshabilita el botón mientras el servidor
 * responde y, si falla, deja el modal abierto con el motivo.
 */
export function DesactivarCodigoButton({
  codigoId,
  codigo,
}: {
  codigoId: string;
  codigo: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const { enviar, pendiente, error, limpiar } = useEnvioAccion(desactivarCodigoAction, {
    // Al éxito la página se revalida y la tarjeta pasa a "Inactivo" (este botón
    // desaparece): el cambio de estado es la confirmación visible.
    alExito: () => setAbierto(false),
  });

  function cerrar() {
    if (pendiente) return;
    limpiar();
    setAbierto(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-3 text-xs text-alerta hover:underline"
      >
        Desactivar
      </button>

      <Modal open={abierto} onClose={cerrar} title="¿Desactivar el código?">
        <p className="text-sm text-muted">
          Las familias ya no podrán registrarse con{" "}
          <b className="font-mono text-foreground">{codigo}</b>. Los registros que ya
          hicieron no se ven afectados. Esta acción no se puede deshacer: para volver
          a invitar, tendrás que crear un código nuevo.
        </p>
        <form onSubmit={enviar} className="mt-5 space-y-3">
          <input type="hidden" name="id" value={codigoId} />
          <MensajeAccion error={error} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={cerrar} disabled={pendiente}>
              Volver
            </Button>
            <Button type="submit" variant="danger" disabled={pendiente} aria-busy={pendiente}>
              {pendiente ? "Desactivando…" : "Sí, desactivar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
