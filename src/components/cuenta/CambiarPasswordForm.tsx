"use client";

import { useActionState, useRef } from "react";
import { cambiarMiPasswordAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Cambio de contraseña propio (G10). Mismo formulario para todos los roles. */
export function CambiarPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await cambiarMiPasswordAction(prev, fd);
      if (res.ok) formRef.current?.reset();
      return res;
    },
    undefined,
  );

  return (
    <Card className="max-w-md">
      <h2 className="mb-1 text-lg font-bold">Cambiar contraseña</h2>
      <p className="mb-4 text-sm text-muted">
        Mínimo 8 caracteres. Evita contraseñas comunes.
      </p>
      <form ref={formRef} action={action} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Contraseña actual</label>
          <input name="actual" type="password" required autoComplete="current-password" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Nueva contraseña</label>
          <input name="nueva" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Confirmar nueva contraseña</label>
          <input name="confirmacion" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </div>
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">{state.error}</p>
        )}
        {state?.ok && <p className="text-sm text-brand">Contraseña actualizada.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </Card>
  );
}
