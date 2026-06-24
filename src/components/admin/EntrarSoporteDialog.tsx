"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { iniciarSoporteAction } from "@/actions/soporte.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";

const campo =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-pitch";

// Abre una sesión de soporte sobre una escuela (ROL-SUPER-ADMIN.md M2).
export function EntrarSoporteDialog({
  escuelaId,
  escuelaNombre,
}: {
  escuelaId: string;
  escuelaNombre: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(iniciarSoporteAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Entrar en soporte
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Soporte · ${escuelaNombre}`}
      >
        <form action={action} className="space-y-3">
          <input type="hidden" name="escuelaId" value={escuelaId} />
          <p className="text-sm text-muted">
            Abrís una sesión de soporte sobre esta escuela. Queda registrada en la
            auditoría. Por defecto es solo lectura.
          </p>
          <input
            name="motivo"
            required
            placeholder="Motivo (ej: ticket #42)"
            className={campo}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="soloLectura"
              defaultChecked
              className="accent-[color:var(--brand)]"
            />
            Solo lectura
          </label>
          {state && !state.ok && (
            <p className="text-sm text-alerta">{state.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Abriendo…" : "Iniciar soporte"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
