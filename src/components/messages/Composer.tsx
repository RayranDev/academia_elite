"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { responderAction } from "@/actions/mensaje.actions";
import { Button } from "@/components/ui/Button";

export function Composer({ conversacionId }: { conversacionId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      try {
        await responderAction(fd);
        form.reset();
        setError(null);
        router.refresh();
      } catch {
        setError("No se pudo enviar.");
      }
    });
  }

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex gap-2">
      <input type="hidden" name="conversacionId" value={conversacionId} />
      <input
        name="cuerpo"
        required
        maxLength={2000}
        placeholder="Escribe un mensaje…"
        className="flex-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Enviar"}
      </Button>
      {error && <span className="text-xs text-alerta">{error}</span>}
    </form>
  );
}
