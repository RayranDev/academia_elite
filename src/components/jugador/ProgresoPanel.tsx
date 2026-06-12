"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { validarSemanaAction } from "@/actions/progreso.actions";
import { HABITOS, ETIQUETA_HABITO, XP_POR_HABITO } from "@/lib/progreso/engine";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Checklist semanal del progreso personal: el responsable marca los hábitos
 * cumplidos y valida la semana (una sola vez por semana ISO).
 */
export function ProgresoPanel({
  jugadorId,
  semanaValidada,
}: {
  jugadorId: string;
  semanaValidada: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (semanaValidada) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-brand" aria-hidden />
          <div>
            <h2 className="text-lg font-bold">Semana validada</h2>
            <p className="text-sm text-muted">
              Ya registraste los hábitos de esta semana. Vuelve la próxima
              semana para seguir sumando experiencia.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("jugadorId", jugadorId);
    startTransition(async () => {
      const res = await validarSemanaAction(undefined, fd);
      if (res.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-1 text-lg font-bold">Validación de esta semana</h2>
      <p className="mb-4 text-sm text-muted">
        Marca lo que tu jugador cumplió esta semana. Cada hábito suma{" "}
        {XP_POR_HABITO} XP a su progreso personal.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        {HABITOS.map((h) => (
          <label
            key={h}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold transition-colors hover:border-brand/60"
          >
            <input
              type="checkbox"
              name={h}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            {ETIQUETA_HABITO[h]}
          </label>
        ))}

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted">Nota (opcional)</span>
          <textarea
            name="nota"
            rows={2}
            maxLength={300}
            className="w-full rounded-lg border border-subtle bg-surface-2 p-2 text-sm outline-none focus:border-brand"
            placeholder="Algo que quieras destacar de la semana…"
          />
        </label>

        {error && <p className="text-sm text-alerta">{error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Validando…" : "Validar semana"}
        </Button>
      </form>
    </Card>
  );
}
