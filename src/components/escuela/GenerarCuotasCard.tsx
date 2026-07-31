"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generarCuotasAction } from "@/actions/membresia.actions";
import {
  CONCEPTOS_MEMBRESIA,
  ETIQUETA_CONCEPTO,
} from "@/lib/validators/membresia";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/action-result";
import type { GeneracionCuotasDTO } from "@/services/membresia.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Mes en curso como AAAA-MM, en la zona del navegador (es el mes que el que cobra tiene en la cabeza). */
function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Emite la cobranza de todo el mes de un click, en vez de cargarla jugador por
 * jugador. Repetir la operación es seguro: las cuotas que ya existen no se tocan.
 */
export function GenerarCuotasCard({ hayAranceles }: { hayAranceles: boolean }) {
  const router = useRouter();
  // Arranca vacío y se completa al montar. `new Date()` da un mes distinto en el
  // servidor (SSR, UTC) y en el cliente (UTC-5): el 31 a las 20:00 local el
  // servidor ya escribe el mes siguiente. Eso no solo rompe la hidratación —
  // haría que el botón de confirmar diga un mes y se emita otro sobre cientos de
  // filas de cobranza (AGENTS.md §6; mismo riesgo documentado en `MonthGrid`).
  const [periodo, setPeriodo] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeriodo(periodoActual());
  }, []);

  const [state, formAction, pending] = useActionState<
    ActionResult<GeneracionCuotasDTO> | undefined,
    FormData
  >(async (_prev, fd) => {
    const res = await generarCuotasAction(undefined, fd);
    if (res.ok) {
      setConfirmando(false);
      router.refresh();
    }
    return res;
  }, undefined);

  return (
    <Card>
      <h2 className="mb-1 text-lg font-bold">Generar la cobranza del mes</h2>
      <p className="mb-3 text-sm text-muted">
        Crea la cuota de todos los jugadores activos en un solo paso. Puedes
        repetirlo sin miedo: las cuotas que ya existen no se modifican, así que no
        se pisa ningún pago registrado.
      </p>

      {!hayAranceles && (
        <p className="mb-3 rounded-lg border border-alerta/50 bg-alerta/10 px-3 py-2 text-sm">
          Todavía no cargaste precios. Las cuotas se van a crear sin monto y
          tendrás que completarlas a mano.{" "}
          <Link href="/escuela/aranceles" className="font-semibold underline">
            Cargar precios
          </Link>
        </p>
      )}

      <form action={formAction} className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="periodo-gen">
            Período
          </label>
          <input
            id="periodo-gen"
            name="periodo"
            type="month"
            required
            value={periodo}
            onChange={(e) => {
              setPeriodo(e.target.value);
              setConfirmando(false);
            }}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="concepto-gen">
            Concepto
          </label>
          <select
            id="concepto-gen"
            name="concepto"
            defaultValue="MENSUALIDAD"
            className={input}
          >
            {CONCEPTOS_MEMBRESIA.map((c) => (
              <option key={c} value={c}>{ETIQUETA_CONCEPTO[c] ?? c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end sm:col-span-2">
          {confirmando ? (
            <div className="flex w-full items-center gap-2">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? "Generando…" : `Sí, generar ${periodo}`}
              </Button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="px-2 text-sm text-muted hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          ) : (
            // Confirmación explícita: la operación crea cientos de filas.
            <Button
              type="button"
              disabled={!periodo}
              onClick={() => setConfirmando(true)}
              className="w-full"
            >
              Generar cuotas
            </Button>
          )}
        </div>
      </form>

      {state && !state.ok && (
        <p className="mt-2 text-sm text-alerta" role="alert">{state.error}</p>
      )}
      {state?.ok && state.data && (
        <p className="mt-2 text-sm" role="status">
          <span className="font-semibold text-pitch">
            {state.data.creadas} cuota(s) creada(s).
          </span>{" "}
          {state.data.yaExistian > 0 && (
            <span className="text-muted">
              {state.data.yaExistian} ya existían y no se tocaron.{" "}
            </span>
          )}
          {state.data.sinPrecio > 0 && (
            <span className="text-alerta">
              {state.data.sinPrecio} quedaron sin monto (su categoría no tiene
              precio vigente).
            </span>
          )}
        </p>
      )}
    </Card>
  );
}
