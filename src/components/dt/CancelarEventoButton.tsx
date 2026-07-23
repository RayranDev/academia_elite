"use client";

import { useState } from "react";
import { cancelarEventoAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Cancelar un evento NOTIFICA a todas las familias convocadas y no se puede
 * deshacer. Antes salía con un solo toque; ahora exige confirmar en un modal que
 * dice a cuántas familias va a alcanzar (PLAN-UX-DT PR-2 · B4).
 */
export function CancelarEventoButton({
  eventoId,
  familias,
}: {
  eventoId: string;
  familias: number;
}) {
  const [abierto, setAbierto] = useState(false);

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

      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title="¿Cancelar el evento?"
      >
        <p className="text-sm text-muted">
          Se notificará a <b className="text-foreground">{familias}</b>{" "}
          {familias === 1 ? "familia" : "familias"} de la convocatoria. Esta
          acción no se puede deshacer.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
            Volver
          </Button>
          <form action={cancelarEventoAction}>
            <input type="hidden" name="eventoId" value={eventoId} />
            <Button type="submit" variant="danger">
              Sí, cancelar y notificar
            </Button>
          </form>
        </div>
      </Modal>
    </>
  );
}
