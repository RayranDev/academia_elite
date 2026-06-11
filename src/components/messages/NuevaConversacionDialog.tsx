"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearConversacionAction } from "@/actions/mensaje.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function NuevaConversacionDialog({
  jugadores,
  basePath,
}: {
  jugadores: { id: string; label: string }[];
  basePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await crearConversacionAction(undefined, fd);
      if (res.ok && res.data) {
        setOpen(false);
        router.push(`${basePath}/${res.data.id}`);
        router.refresh();
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={jugadores.length === 0}>
        + Nueva conversación
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva conversación">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Sobre el jugador</label>
            <select name="jugadorId" className={input}>
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Asunto</label>
            <input name="asunto" required className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Mensaje</label>
            <textarea name="cuerpo" rows={3} required className={input} />
          </div>
          {error && <p className="text-sm text-alerta">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Enviando…" : "Enviar"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
