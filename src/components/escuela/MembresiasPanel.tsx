"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  registrarMembresiaAction,
  cambiarEstadoMembresiaAction,
} from "@/actions/membresia.actions";
import {
  ESTADOS_MEMBRESIA,
  CONCEPTOS_MEMBRESIA,
  MEDIOS_PAGO,
  etiquetaConcepto,
  etiquetaEstado,
  etiquetaMedioPago,
} from "@/lib/validators/membresia";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FechaLocal } from "@/components/ui/FechaLocal";
import type { ActionResult } from "@/lib/action-result";
import type { MembresiaDTO } from "@/services/membresia.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

const TONO: Record<string, "pitch" | "oro" | "alerta"> = {
  PAGADA: "pitch",
  PENDIENTE: "oro",
  VENCIDA: "alerta",
};

export function MembresiasPanel({
  membresias,
  jugadores,
}: {
  membresias: MembresiaDTO[];
  jugadores: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (_prev, fd) => {
      const res = await registrarMembresiaAction(undefined, fd);
      if (res.ok) router.refresh();
      return res;
    },
    undefined,
  );

  const vencidas = membresias.filter((m) => m.estado === "VENCIDA").length;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-bold">Registrar / actualizar cobro</h2>
        <form action={formAction} className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted" htmlFor="jugador-cobro">
              Jugador
            </label>
            <ComboboxJugador jugadores={jugadores} inputId="jugador-cobro" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="periodo-cobro">
              Período
            </label>
            <input
              id="periodo-cobro"
              name="periodo"
              type="month"
              required
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="concepto-cobro">
              Concepto
            </label>
            <select
              id="concepto-cobro"
              name="concepto"
              defaultValue="MENSUALIDAD"
              className={input}
            >
              {CONCEPTOS_MEMBRESIA.map((c) => (
                <option key={c} value={c}>{etiquetaConcepto(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="monto-cobro">
              Monto (opcional)
            </label>
            <input
              id="monto-cobro"
              name="monto"
              type="number"
              min={0}
              step="any"
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="descuento-cobro">
              Descuento (opcional)
            </label>
            <input
              id="descuento-cobro"
              name="descuento"
              type="number"
              min={0}
              step="any"
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="estado-cobro">
              Estado
            </label>
            <select
              id="estado-cobro"
              name="estado"
              defaultValue="PENDIENTE"
              className={input}
            >
              {ESTADOS_MEMBRESIA.map((e) => (
                <option key={e} value={e}>{etiquetaEstado(e)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Guardando…" : "Guardar cobro"}
            </Button>
          </div>
        </form>
        {state && !state.ok && (
          <p className="mt-2 text-sm text-alerta" role="alert">{state.error}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          El período usa el mes seleccionado (AAAA-MM). Volver a guardar el mismo
          jugador, mes y concepto actualiza el cobro existente. El descuento
          (beca, hermano) se resta del monto en el total.
        </p>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-bold">Cuotas</h2>
          {vencidas > 0 && <Badge tono="alerta">{vencidas} vencida(s)</Badge>}
        </div>
        {membresias.length === 0 ? (
          <p className="p-4 pt-0 text-sm text-muted">Sin cuotas registradas.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Jugador</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Período</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2">Neto</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Pago</th>
                <th className="px-4 py-2">Cambiar</th>
              </tr>
            </thead>
            <tbody>
              {membresias.map((m) => (
                <tr key={m.id} className="border-b border-subtle/50">
                  <td className="px-4 py-2">{m.jugadorNombre}</td>
                  <td className="px-4 py-2 text-muted">{m.categoriaNombre}</td>
                  <td className="px-4 py-2 tabular">{m.periodo}</td>
                  <td className="px-4 py-2 text-muted">
                    {etiquetaConcepto(m.concepto)}
                  </td>
                  <td className="px-4 py-2 tabular">
                    {m.monto == null ? (
                      "—"
                    ) : (
                      <>
                        {m.monto - (m.descuento ?? 0)}
                        {m.descuento ? (
                          <span className="ml-1 text-xs text-muted">
                            (−{m.descuento})
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tono={TONO[m.estado] ?? "oro"}>{etiquetaEstado(m.estado)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">
                    {m.pagadaEn ? (
                      <>
                        <FechaLocal iso={m.pagadaEn} formato="d MMM yyyy" />
                        {m.medioPago && (
                          <span className="ml-1">· {etiquetaMedioPago(m.medioPago)}</span>
                        )}
                        {m.referenciaPago && (
                          <span className="ml-1 opacity-70">
                            #{m.referenciaPago}
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <CambiarEstado membresiaId={m.id} estadoActual={m.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/**
 * Autocomplete de jugador (C2.2): reemplaza el `<select>` con miles de opciones
 * por un buscador que filtra al escribir. El `id` elegido viaja en un input
 * oculto `jugadorId`, así la action no cambia. Filtra sobre la lista ya cargada
 * (para una escuela son cientos, no miles) y muestra hasta 20 coincidencias.
 */
function ComboboxJugador({
  jugadores,
  inputId,
}: {
  jugadores: { id: string; nombre: string }[];
  inputId?: string;
}) {
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState<{ id: string; nombre: string } | null>(
    null,
  );
  const [abierto, setAbierto] = useState(false);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return jugadores.slice(0, 20);
    return jugadores.filter((j) => j.nombre.toLowerCase().includes(q)).slice(0, 20);
  }, [texto, jugadores]);

  return (
    <div className="relative">
      <input type="hidden" name="jugadorId" value={elegido?.id ?? ""} />
      <input
        id={inputId}
        type="text"
        value={elegido ? elegido.nombre : texto}
        onChange={(e) => {
          setElegido(null);
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        // Cierre diferido: deja que el click en una opción se registre primero.
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        placeholder="Buscá por nombre o apellido…"
        aria-label="Buscar jugador"
        autoComplete="off"
        className={input}
      />
      {abierto && filtrados.length > 0 && !elegido && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-subtle bg-surface shadow-xl">
          {filtrados.map((j) => (
            <li key={j.id}>
              <button
                type="button"
                onClick={() => {
                  setElegido(j);
                  setTexto("");
                  setAbierto(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                {j.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Cambio de estado de un cobro. Marcar PAGADA abre un paso extra para registrar
 * medio y comprobante: sin eso queda un "pagada" que después nadie puede
 * conciliar contra el banco. Los otros estados se aplican directo.
 */
function CambiarEstado({
  membresiaId,
  estadoActual,
}: {
  membresiaId: string;
  estadoActual: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cobrando, setCobrando] = useState(false);
  const [medioPago, setMedioPago] = useState<string>(MEDIOS_PAGO[0]);
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);

  function enviar(estado: string, pago?: { medio: string; referencia: string }) {
    const fd = new FormData();
    fd.set("membresiaId", membresiaId);
    fd.set("estado", estado);
    if (pago) {
      fd.set("medioPago", pago.medio);
      fd.set("referenciaPago", pago.referencia);
    }
    startTransition(async () => {
      const res = await cambiarEstadoMembresiaAction(undefined, fd);
      if (res.ok) {
        setCobrando(false);
        setReferencia("");
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function alElegir(estado: string) {
    if (estado === estadoActual) return;
    if (estado === "PAGADA") {
      setCobrando(true);
      return;
    }
    enviar(estado);
  }

  if (cobrando) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <select
            value={medioPago}
            onChange={(e) => setMedioPago(e.target.value)}
            aria-label="Medio de pago"
            className="rounded-lg border border-subtle bg-surface-2 px-2 py-1 text-xs outline-none focus:border-brand"
          >
            {MEDIOS_PAGO.map((m) => (
              <option key={m} value={m}>{etiquetaMedioPago(m)}</option>
            ))}
          </select>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Comprobante"
            aria-label="Referencia o comprobante del pago"
            maxLength={60}
            className="w-28 rounded-lg border border-subtle bg-surface-2 px-2 py-1 text-xs outline-none focus:border-brand"
          />
          <Button
            type="button"
            disabled={pending}
            onClick={() => enviar("PAGADA", { medio: medioPago, referencia })}
            className="px-2 py-1 text-xs"
          >
            {pending ? "…" : "Cobrar"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setCobrando(false);
              setError(null);
            }}
            className="px-1 text-xs text-muted hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
        {error && (
          <p className="text-xs text-alerta" role="alert">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={estadoActual}
        disabled={pending}
        onChange={(e) => alElegir(e.target.value)}
        aria-label="Cambiar estado del cobro"
        className="rounded-lg border border-subtle bg-surface-2 px-2 py-1 text-xs outline-none focus:border-brand"
      >
        {ESTADOS_MEMBRESIA.map((e) => (
          <option key={e} value={e}>{etiquetaEstado(e)}</option>
        ))}
      </select>
      {error && <p className="text-xs text-alerta" role="alert">{error}</p>}
    </div>
  );
}
