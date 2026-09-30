"use client";

import { useState } from "react";
import { cancelarEventoAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";

/**
 * Cancelar un evento NOTIFICA a todas las familias convocadas y no se puede
 * deshacer. Antes salía con un solo toque; ahora exige confirmar en un modal que
 * dice a cuántas familias va a alcanzar (PLAN-UX-DT PR-2 · B4). Mientras el
 * servidor responde el botón se deshabilita ("Cancelando…") y si falla el modal
 * se queda abierto con el motivo: cancelar y notificar no puede hacerse "a ciegas".
 */
export function CancelarEventoButton({
  eventoId,
  familias,
}: {
  eventoId: string;
  familias: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const { enviar, pendiente, error, limpiar } = useEnvioAccion(cancelarEventoAction, {
    // Al éxito la página se revalida y este botón desaparece (el evento queda
    // cancelado); el aviso "Este evento fue cancelado" toma su lugar.
    alExito: () => setAbierto(false),
  });

  function cerrar() {
    if (pendiente) return;
    limpiar();
    setAbierto(false);
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setAbierto(true)}
      >
        Cancelar evento
      </Button>

      <Modal open={abierto} onClose={cerrar} title="¿Cancelar el evento?">
        <p className="text-sm text-muted">
          Se notificará a <b className="text-foreground">{familias}</b>{" "}
          {familias === 1 ? "familia" : "familias"} de la convocatoria. Esta
          acción no se puede deshacer.
        </p>
        <form onSubmit={enviar} className="mt-5 space-y-3">
          <input type="hidden" name="eventoId" value={eventoId} />
          <MensajeAccion error={error} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={cerrar} disabled={pendiente}>
              Volver
            </Button>
            <Button type="submit" variant="danger" disabled={pendiente} aria-busy={pendiente}>
              {pendiente ? "Cancelando…" : "Sí, cancelar y notificar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
