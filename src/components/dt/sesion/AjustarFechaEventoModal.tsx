"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FechaLocal } from "@/components/ui/FechaLocal";

/**
 * Aviso al arrancar el Modo Sesión un día distinto al programado (PLAN-UX-DT,
 * ver DECISIONES.md #75). No es control de acceso: es una guarda de calidad de
 * dato, resuelta enteramente en el cliente con la hora local del DT.
 */
export function AjustarFechaEventoModal({
  open,
  fechaProgramada,
  pending,
  onAjustar,
  onCancelar,
}: {
  open: boolean;
  /** ISO de `evento.inicio` (fecha programada original). */
  fechaProgramada: string;
  pending: boolean;
  onAjustar: () => void;
  onCancelar: () => void;
}) {
  // "Hoy" solo se conoce en el cliente, y recién tras montar (mismo criterio
  // que el chequeo de día en ModoSesion.tsx y AGENTS.md §6): calcularlo en el
  // cuerpo del render correría también en el server durante el SSR de este
  // client component, con la hora UTC del server en vez de la del DT.
  const [hoy, setHoy] = useState<string | null>(null);
  useEffect(() => {
    // "hoy" solo se conoce en el cliente tras montar (ver ModoSesion.tsx
    // para el mismo criterio con `new Date()` y AGENTS.md §6).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setHoy(new Date().toISOString());
  }, [open]);

  return (
    <Modal open={open} onClose={onCancelar} title="Fecha distinta a la programada">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Este evento estaba programado para el{" "}
          <strong className="text-foreground">
            <FechaLocal iso={fechaProgramada} formato="d 'de' MMMM, yyyy" />
          </strong>{" "}
          y hoy es{" "}
          <strong className="text-foreground">
            {hoy && <FechaLocal iso={hoy} formato="d 'de' MMMM, yyyy" />}
          </strong>
          . ¿Ajustamos la fecha del evento al momento en que lo estás arrancando?
        </p>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={pending} onClick={onAjustar}>
            {pending ? "Ajustando…" : "Ajustar y arrancar"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
