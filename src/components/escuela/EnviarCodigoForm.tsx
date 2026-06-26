"use client";

import { useActionState } from "react";
import { enviarCodigoInvitacionAction } from "@/actions/escuela.actions";
import type { ActionResult } from "@/lib/action-result";

export function EnviarCodigoForm({ codigoId }: { codigoId: string }) {
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(enviarCodigoInvitacionAction, undefined);

  if (state?.ok) {
    return <p className="mt-3 text-xs text-pitch">Código enviado por correo ✅</p>;
  }

  return (
    <div className="mt-3">
      <form action={action} className="flex gap-2">
        <input type="hidden" name="codigoId" value={codigoId} />
        <input
          name="email"
          type="email"
          required
          placeholder="correo de la familia"
          className="min-w-0 flex-1 rounded-lg border border-subtle bg-surface-2 px-2 py-1 text-xs text-foreground outline-none focus:border-pitch"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg border border-subtle px-2 py-1 text-xs font-semibold text-pitch hover:bg-surface-2 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </form>
      {state && !state.ok && (
        <p className="mt-1 text-xs text-alerta">{state.error}</p>
      )}
    </div>
  );
}
