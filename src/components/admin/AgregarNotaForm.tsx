"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { agregarNotaLeadAction } from "@/actions/admin.actions";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/action-result";

const campo =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-pitch";

/** Agrega una nota de seguimiento al historial del lead. */
export function AgregarNotaForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(agregarNotaLeadAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <textarea
        name="comentario"
        required
        rows={2}
        placeholder="Agregar nota de seguimiento…"
        className={campo}
      />
      {state && !state.ok && (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Agregando…" : "Agregar nota"}
      </Button>
    </form>
  );
}
