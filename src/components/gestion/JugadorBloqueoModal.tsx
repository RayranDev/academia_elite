"use client";

import { useActionState, useState } from "react";
import {
  bloquearAccesoAction,
  desbloquearAccesoAction,
} from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ETIQUETA_BLOQUEO } from "@/lib/bloqueo";
import { TIPOS_BLOQUEO } from "@/types";
import type { JugadorGestionDTO } from "@/services/gestion-jugadores.service";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Bloquear/desbloquear el acceso de la familia, con motivos predefinidos. */
export function JugadorBloqueoModal({
  jugador,
  onClose,
}: {
  jugador: JugadorGestionDTO;
  onClose: (cambio: boolean) => void;
}) {
  const desbloquear = jugador.bloqueado;
  const [tipo, setTipo] = useState<string>("PAGO");
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = desbloquear
        ? await desbloquearAccesoAction(prev, fd)
        : await bloquearAccesoAction(prev, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal
      open
      onClose={() => onClose(false)}
      title={desbloquear ? "Desbloquear acceso" : "Bloquear acceso"}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="jugadorId" value={jugador.id} />
        {desbloquear ? (
          <p className="text-sm text-muted">
            La familia de {jugador.nombre} {jugador.apellido} recuperará el
            acceso a la plataforma.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              La familia de {jugador.nombre} {jugador.apellido} no podrá entrar
              y verá el mensaje del motivo elegido. Es reversible.
            </p>
            <div>
              <label className="mb-1 block text-xs text-muted">Motivo</label>
              <select
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className={input}
              >
                {TIPOS_BLOQUEO.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_BLOQUEO[t]}
                  </option>
                ))}
              </select>
            </div>
            {tipo === "PERSONALIZADO" && (
              <div>
                <label className="mb-1 block text-xs text-muted">
                  Mensaje que verá la familia
                </label>
                <textarea name="mensaje" rows={3} required maxLength={300} className={input} />
              </div>
            )}
          </>
        )}
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant={desbloquear ? "primary" : "danger"}
            className="flex-1"
            disabled={pending}
          >
            {pending ? "Aplicando…" : desbloquear ? "Desbloquear" : "Bloquear acceso"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
