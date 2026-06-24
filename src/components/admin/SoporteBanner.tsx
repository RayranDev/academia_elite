"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  finalizarSoporteAction,
  habilitarEscrituraSoporteAction,
} from "@/actions/soporte.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";
import type { SoporteSesionDTO } from "@/services/soporte.service";

const campo =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-pitch";

// Banner imposible de ignorar mientras hay una sesión de soporte activa (M2).
export function SoporteBanner({ sesion }: { sesion: SoporteSesionDTO | null }) {
  const router = useRouter();
  const [habOpen, setHabOpen] = useState(false);
  const [finState, finalizar, finPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(finalizarSoporteAction, undefined);
  const [habState, habilitar, habPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(habilitarEscrituraSoporteAction, undefined);

  useEffect(() => {
    if (finState?.ok || habState?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHabOpen(false);
      router.refresh();
    }
  }, [finState, habState, router]);

  if (!sesion) return null;

  return (
    <div className="sticky top-0 z-40 mb-4 rounded-lg border-2 border-alerta bg-alerta/15 px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-alerta px-2 py-0.5 text-xs font-black uppercase tracking-widest text-base">
            Modo soporte
          </span>
          <span className="font-semibold">Escuela {sesion.escuelaNombre}</span>
          <span className="text-muted">
            · {sesion.soloLectura ? "solo lectura" : "escritura habilitada"} ·{" "}
            {sesion.motivo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sesion.soloLectura && (
            <Button size="sm" variant="secondary" onClick={() => setHabOpen(true)}>
              Habilitar escritura
            </Button>
          )}
          <form action={finalizar}>
            <Button size="sm" variant="danger" type="submit" disabled={finPending}>
              {finPending ? "Finalizando…" : "Finalizar"}
            </Button>
          </form>
        </div>
      </div>

      <Modal
        open={habOpen}
        onClose={() => setHabOpen(false)}
        title="Habilitar escritura"
      >
        <form action={habilitar} className="space-y-3">
          <p className="text-sm text-muted">
            Pasar a escritura queda auditado como una acción aparte. Indicá el motivo.
          </p>
          <input
            name="motivo"
            required
            placeholder="Motivo del cambio a escritura"
            className={campo}
          />
          {habState && !habState.ok && (
            <p className="text-sm text-alerta">{habState.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setHabOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={habPending}>
              {habPending ? "Habilitando…" : "Habilitar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
