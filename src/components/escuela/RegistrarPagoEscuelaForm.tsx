"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  registrarPagoEscuelaAction,
  cuotasReportablesEscuelaAction,
} from "@/actions/pago.actions";
import { etiquetaEstado } from "@/lib/validators/membresia";
import { formatearMonto } from "@/lib/cobranza";
import { ComboboxJugador } from "@/components/escuela/ComboboxJugador";
import { CamposMedios, type FilaMedio } from "@/components/escuela/CamposMedios";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ActionResult } from "@/lib/action-result";
import type { CuotaReportableDTO } from "@/services/pago.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

const MEDIO_INICIAL: FilaMedio = { medio: "EFECTIVO", monto: "", referencia: "" };

/**
 * Registro directo de un pago (efectivo en la cancha, transferencia recibida
 * fuera del reporte de la familia). Nace ya APROBADO: el admin ES el
 * validador, así que no pasa por la bandeja de revisión.
 *
 * Comparte con `ReportarPagoForm` (jugador) la selección de medios
 * (`CamposMedios`), pero la lista de cuotas no llega precargada: se pide
 * después de elegir el jugador, porque acá cualquiera de los cientos de
 * jugadores de la escuela es candidato.
 */
export function RegistrarPagoEscuelaForm({
  jugadores,
}: {
  jugadores: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [jugadorId, setJugadorId] = useState<string | null>(null);
  const [cuotas, setCuotas] = useState<CuotaReportableDTO[]>([]);
  const [cargando, setCargando] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [medios, setMedios] = useState<FilaMedio[]>([MEDIO_INICIAL]);
  // Arranca vacío y se completa al montar, no en el initializer: `new Date()`
  // ahí corre en el servidor (SSR, UTC) y de nuevo en el cliente durante la
  // hidratación, y cerca de un cambio de día en Colombia (UTC-5) dan fechas
  // distintas — mismo riesgo que ya documenta `GenerarCuotasCard` (AGENTS.md §6).
  const [fechaPago, setFechaPago] = useState("");
  // `hoy` es aparte de `fechaPago`: éste cambia si el admin elige otra fecha,
  // pero el tope del campo (`max`) tiene que seguir siendo HOY sin importar
  // qué fecha esté seleccionada.
  const [hoy, setHoy] = useState("");
  useEffect(() => {
    const hoyLocal = new Date().toISOString().slice(0, 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFechaPago(hoyLocal);
    setHoy(hoyLocal);
  }, []);

  async function elegirJugador(j: { id: string; nombre: string } | null) {
    setJugadorId(j?.id ?? null);
    setSeleccionadas(new Set());
    if (!j) {
      setCuotas([]);
      return;
    }
    setCargando(true);
    const res = await cuotasReportablesEscuelaAction(j.id);
    setCargando(false);
    setCuotas(res.ok ? (res.data ?? []) : []);
  }

  const totalCuotas = useMemo(
    () => cuotas.filter((c) => seleccionadas.has(c.id)).reduce((acc, c) => acc + c.neto, 0),
    [cuotas, seleccionadas],
  );
  const totalMedios = useMemo(
    () => medios.reduce((acc, m) => acc + (Number(m.monto) || 0), 0),
    [medios],
  );
  const cierra =
    seleccionadas.size > 0 && Math.round(totalCuotas * 100) === Math.round(totalMedios * 100);

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
      const res = await registrarPagoEscuelaAction(undefined, fd);
      if (res.ok) {
        setSeleccionadas(new Set());
        setCuotas([]);
        setJugadorId(null);
        setMedios([MEDIO_INICIAL]);
        router.refresh();
      }
      return res;
    },
    undefined,
  );

  return (
    <Card>
      <h2 className="mb-1 text-lg font-bold">Registrar un pago</h2>
      <p className="mb-4 text-sm text-muted">
        Para lo que cobraste directo (efectivo en la cancha, por ejemplo). Queda
        aprobado al instante: acá no hace falta revisión, la estás haciendo tú.
      </p>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-muted" htmlFor="jugador-pago">
          Jugador
        </label>
        <ComboboxJugador
          jugadores={jugadores}
          inputId="jugador-pago"
          onElegir={elegirJugador}
        />
      </div>

      {cargando && <p className="mb-4 text-sm text-muted">Buscando sus cuotas…</p>}

      {!cargando && jugadorId && cuotas.length === 0 && (
        <p className="mb-4 text-sm text-muted">
          Este jugador no tiene cuotas pendientes por cobrar.
        </p>
      )}

      {cuotas.length > 0 && (
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
                  form="form-registrar-pago"
                />
                <span className="text-muted">
                  {c.conceptoNombre} · {c.periodo}
                </span>
              </span>
              <span className="flex items-center gap-2 tabular">
                {c.estado === "VENCIDA" && <Badge tono="alerta">{etiquetaEstado(c.estado)}</Badge>}
                {formatearMonto(c.neto)}
              </span>
            </label>
          ))}
        </div>
      )}

      <form id="form-registrar-pago" action={formAction} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="fechaPago-esc">
              ¿Cuándo se cobró?
            </label>
            <input
              id="fechaPago-esc"
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
            <label className="mb-1 block text-xs text-muted" htmlFor="nota-esc">
              Nota (opcional)
            </label>
            <input id="nota-esc" name="nota" maxLength={200} className={input} />
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
            Pago registrado y aprobado.
          </p>
        )}

        <Button type="submit" disabled={pending || seleccionadas.size === 0}>
          {pending ? "Guardando…" : "Registrar pago"}
        </Button>
      </form>
    </Card>
  );
}
