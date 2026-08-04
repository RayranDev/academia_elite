"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  registrarEgresoAction,
  eliminarEgresoAction,
} from "@/actions/egreso.actions";
import {
  CONCEPTOS_EGRESO,
  etiquetaConceptoEgreso,
} from "@/lib/validators/egreso";
import { MEDIOS_PAGO, etiquetaMedioPago } from "@/lib/validators/membresia";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { formatearMonto } from "@/lib/cobranza";
import type { ActionResult } from "@/lib/action-result";
import type { EgresoDTO, ResumenCajaDTO } from "@/services/egreso.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function EgresosPanel({
  egresos,
  resumen,
}: {
  egresos: EgresoDTO[];
  resumen: ResumenCajaDTO;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (_prev, fd) => {
      const res = await registrarEgresoAction(undefined, fd);
      if (res.ok) router.refresh();
      return res;
    },
    undefined,
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-3xl font-black tabular">
            {formatearMonto(resumen.ingresos)}
          </div>
          <div className="mt-1 text-sm text-muted">Ingresos del mes</div>
        </Card>
        <Card>
          <div className="text-3xl font-black tabular">
            {formatearMonto(resumen.egresos)}
          </div>
          <div className="mt-1 text-sm text-muted">Egresos del mes</div>
        </Card>
        <Card className={resumen.neto < 0 ? "border-alerta/50" : ""}>
          <div
            className={`text-3xl font-black tabular ${resumen.neto < 0 ? "text-alerta" : ""}`}
          >
            {formatearMonto(resumen.neto)}
          </div>
          <div className="mt-1 text-sm text-muted">Caja neta del mes</div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Registrar egreso</h2>
        <form action={formAction} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="concepto-egreso">
              Concepto
            </label>
            <select
              id="concepto-egreso"
              name="concepto"
              defaultValue={CONCEPTOS_EGRESO[0]}
              className={input}
            >
              {CONCEPTOS_EGRESO.map((c) => (
                <option key={c} value={c}>{etiquetaConceptoEgreso(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="monto-egreso">
              Monto
            </label>
            <input
              id="monto-egreso"
              name="monto"
              type="number"
              min={0.01}
              step="any"
              required
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="fecha-egreso">
              Fecha
            </label>
            <input
              id="fecha-egreso"
              name="fecha"
              type="date"
              required
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="medio-egreso">
              Medio de pago (opcional)
            </label>
            <select id="medio-egreso" name="medioPago" defaultValue="" className={input}>
              <option value="">—</option>
              {MEDIOS_PAGO.map((m) => (
                <option key={m} value={m}>{etiquetaMedioPago(m)}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted" htmlFor="descripcion-egreso">
              Descripción (opcional)
            </label>
            <textarea
              id="descripcion-egreso"
              name="descripcion"
              rows={1}
              maxLength={200}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="referencia-egreso">
              Referencia (opcional)
            </label>
            <input
              id="referencia-egreso"
              name="referenciaPago"
              maxLength={60}
              className={input}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Guardando…" : "Guardar egreso"}
            </Button>
          </div>
        </form>
        {state && !state.ok && (
          <p className="mt-2 text-sm text-alerta" role="alert">{state.error}</p>
        )}
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-bold">Egresos</h2>
        </div>
        {egresos.length === 0 ? (
          <p className="p-4 pt-0 text-sm text-muted">Sin egresos registrados.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2">Monto</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Pago</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {egresos.map((e) => (
                <FilaEgreso key={e.id} egreso={e} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function FilaEgreso({ egreso }: { egreso: EgresoDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function eliminar() {
    if (!window.confirm("¿Eliminar este egreso? Esta acción no se puede deshacer.")) {
      return;
    }
    const fd = new FormData();
    fd.set("id", egreso.id);
    startTransition(async () => {
      const res = await eliminarEgresoAction(undefined, fd);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <tr className="border-b border-subtle/50">
      <td className="px-4 py-2 tabular">
        <FechaLocal iso={egreso.fecha} formato="d MMM yyyy" />
      </td>
      <td className="px-4 py-2 text-muted">{etiquetaConceptoEgreso(egreso.concepto)}</td>
      <td className="px-4 py-2 tabular">{formatearMonto(egreso.monto)}</td>
      <td className="px-4 py-2 text-muted">{egreso.descripcion ?? "—"}</td>
      <td className="px-4 py-2 text-xs text-muted">
        {egreso.medioPago ? (
          <>
            {etiquetaMedioPago(egreso.medioPago)}
            {egreso.referenciaPago && (
              <span className="ml-1 opacity-70">#{egreso.referenciaPago}</span>
            )}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2 text-right">
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={eliminar}
        >
          {pending ? "…" : "Eliminar"}
        </Button>
        {error && <p className="mt-1 text-xs text-alerta" role="alert">{error}</p>}
      </td>
    </tr>
  );
}
