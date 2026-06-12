"use client";

import { useActionState } from "react";
import { subirEscudoAction } from "@/actions/escuela.actions";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/action-result";

export function EscudoUpload({
  escuelaId,
  tieneEscudo,
}: {
  escuelaId: string;
  tieneEscudo: boolean;
}) {
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(subirEscudoAction, undefined);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-subtle bg-surface-2">
          {tieneEscudo || state?.ok ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/archivos/escudo/${escuelaId}`}
              alt="Escudo"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-muted">Sin escudo</span>
          )}
        </div>
        <p className="text-xs text-muted">
          Solo PNG (idealmente con fondo transparente), máx. 1 MB. Se ajusta a
          256×256.
        </p>
      </div>

      <form action={action} className="space-y-2">
        <input
          type="file"
          name="escudo"
          accept="image/png"
          required
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-foreground"
        />
        {state && !state.ok && (
          <p className="text-sm text-alerta">{state.error}</p>
        )}
        {state?.ok && <p className="text-sm text-brand">Escudo actualizado.</p>}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Subiendo…" : "Subir escudo"}
        </Button>
      </form>
    </div>
  );
}
