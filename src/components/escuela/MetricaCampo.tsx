"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fijarMetricaAction, quitarMetricaAction } from "@/actions/escuela.actions";
import { Button } from "@/components/ui/Button";
import type { FilaParametro } from "@/lib/parametros";

const input =
  "w-24 rounded-lg border border-subtle bg-surface-2 px-2 py-1.5 text-sm tabular outline-none focus:border-brand";

/**
 * Edita un override de métrica de la escuela: muestra el valor global y permite
 * fijar uno propio o volver al global. El valor efectivo se resalta.
 */
export function MetricaCampo({ clave, fila }: { clave: string; fila: FilaParametro }) {
  const router = useRouter();
  const [valor, setValor] = useState(String(fila.valorEfectivo ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tieneOverride = fila.valorOverride != null;

  function fijar() {
    const fd = new FormData();
    fd.set("clave", clave);
    fd.set("valor", valor);
    startTransition(async () => {
      const res = await fijarMetricaAction(undefined, fd);
      if (res.ok) {
        setError(null);
        router.refresh();
      } else setError(res.error);
    });
  }

  function quitar() {
    const fd = new FormData();
    fd.set("clave", clave);
    startTransition(async () => {
      const res = await quitarMetricaAction(undefined, fd);
      if (res.ok) {
        setError(null);
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="any"
          value={valor}
          aria-label={clave}
          onChange={(e) => setValor(e.target.value)}
          className={input}
        />
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={fijar}>
          Guardar
        </Button>
        {tieneOverride && (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={quitar}>
            Quitar
          </Button>
        )}
      </div>
      <span className="text-[11px] text-muted">
        {tieneOverride ? (
          <span className="text-brand">Propio · global {fila.valorGlobal}</span>
        ) : (
          <>Usando el global ({fila.valorGlobal})</>
        )}
      </span>
      {error && <span className="text-[11px] text-alerta">{error}</span>}
    </div>
  );
}
