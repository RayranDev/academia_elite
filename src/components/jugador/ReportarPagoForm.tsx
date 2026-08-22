"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { reportarPagoAction } from "@/actions/pago.actions";
import { etiquetaEstado } from "@/lib/validators/membresia";
import { formatearMonto } from "@/lib/cobranza";
import { CamposMedios, type FilaMedio } from "@/components/escuela/CamposMedios";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ActionResult } from "@/lib/action-result";
import type { CuotaReportableDTO } from "@/services/pago.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

const MEDIO_INICIAL: FilaMedio = { medio: "TRANSFERENCIA", monto: "", referencia: "" };

/**
 * Reporte de un pago. La familia tilda las cuotas que está pagando, dice cómo
 * pagó (uno o varios medios, cada uno con su comprobante opcional) y manda.
 * Queda EN REVISIÓN: la escuela lo valida antes de que la cuota se marque paga.
 */
export function ReportarPagoForm({ cuotas }: { cuotas: CuotaReportableDTO[] }) {
  const router = useRouter();
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [medios, setMedios] = useState<FilaMedio[]>([MEDIO_INICIAL]);
  const [fechaPago, setFechaPago] = useState("");
  // Tope del `<input type="date">`: se completa al montar, no en el
  // initializer — `new Date()` ahí corre distinto en el servidor (SSR, UTC)
  // y en el cliente durante la hidratación (mismo riesgo que
  // `GenerarCuotasCard`, AGENTS.md §6).
  const [hoy, setHoy] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoy(new Date().toISOString().slice(0, 10));
  }, []);

  const totalCuotas = useMemo(
    () =>
      cuotas
        .filter((c) => seleccionadas.has(c.id))
        .reduce((acc, c) => acc + c.neto, 0),
    [cuotas, seleccionadas],
  );
  const totalMedios = useMemo(
    () => medios.reduce((acc, m) => acc + (Number(m.monto) || 0), 0),
    [medios],
  );
  // Solo una guía visual: el servidor es quien decide de verdad. Redondeo a
  // centavos por el mismo motivo que el servicio (comparar floats con === es
  // frágil).
  const cierra =
    seleccionadas.size > 0 &&
    Math.round(totalCuotas * 100) === Math.round(totalMedios * 100);

  function alternar(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (_prev, fd) => {
      const res = await reportarPagoAction(undefined, fd);
      if (res.ok) {
        setSeleccionadas(new Set());
        setMedios([MEDIO_INICIAL]);
        setFechaPago("");
        router.refresh();
      }
      return res;
    },
    undefined,
  );

  if (cuotas.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">
          No tienes cuotas pendientes por reportar. Si acabás de pagar algo que
          no aparece acá, puede que la escuela todavía no haya cargado el
          precio de ese concepto.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">Reportar un pago</h2>
      <p className="mb-4 text-sm text-muted">
        Tilda las cuotas que pagaste, dinos cómo y desde cuándo queda en
        revisión de la escuela.
      </p>

      <div className="mb-4 space-y-2">
        {cuotas.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                name="membresiaId"
                value={c.id}
                checked={seleccionadas.has(c.id)}
                onChange={() => alternar(c.id)}
                form="form-reportar-pago"
              />
              <span>
                <span className="font-semibold">{c.jugadorNombre}</span>{" "}
                <span className="text-muted">
                  · {c.conceptoNombre} · {c.periodo}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2 tabular">
              {c.estado === "VENCIDA" && <Badge tono="alerta">{etiquetaEstado(c.estado)}</Badge>}
              {formatearMonto(c.neto)}
            </span>
          </label>
        ))}
      </div>

      <form id="form-reportar-pago" action={formAction} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="fechaPago">
              ¿Cuándo pagaste?
            </label>
            <input
              id="fechaPago"
              name="fechaPago"
              type="date"
              required
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              max={hoy || undefined}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="nota">
              Nota (opcional)
            </label>
            <input id="nota" name="nota" maxLength={200} className={input} />
          </div>
        </div>

        <CamposMedios
          medios={medios}
          onChange={(i, cambios) =>
            setMedios((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...cambios } : m)))
          }
          onAgregar={() =>
            setMedios((prev) => [...prev, { medio: "EFECTIVO", monto: "", referencia: "" }])
          }
        />

        <div className="flex items-center justify-between rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm">
          <span className="text-muted">
            Cuotas elegidas: {formatearMonto(totalCuotas)} · Reportado:{" "}
            {formatearMonto(totalMedios)}
          </span>
          {seleccionadas.size > 0 && !cierra && (
            <span className="text-alerta">No coincide todavía</span>
          )}
        </div>

        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="text-sm text-pitch" role="status">
            Reportado. La escuela lo va a revisar.
          </p>
        )}

        <Button type="submit" disabled={pending || seleccionadas.size === 0}>
          {pending ? "Enviando…" : "Reportar pago"}
        </Button>
      </form>
    </Card>
  );
}
