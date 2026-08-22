"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  aprobarPagoAction,
  aprobarPagosLoteAction,
  rechazarPagoAction,
  anularPagoAction,
} from "@/actions/pago.actions";
import { ETIQUETA_ESTADO_PAGO, ESTADOS_PAGO } from "@/lib/validators/pago";
import { etiquetaMedioPago } from "@/lib/validators/membresia";
import { formatearMonto } from "@/lib/cobranza";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FechaCalendario } from "@/components/ui/FechaCalendario";
import type { ActionResult } from "@/lib/action-result";
import type { PaginatedPagosDTO } from "@/services/pago.service";

const TONO: Record<string, "pitch" | "oro" | "alerta" | "neutral"> = {
  REPORTADO: "oro",
  APROBADO: "pitch",
  RECHAZADO: "alerta",
  ANULADO: "neutral",
};

const FILTRO_BASE =
  "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors";

function hrefPestana(estado: string | undefined): string {
  return estado ? `/escuela/pagos?estado=${estado}` : "/escuela/pagos";
}

/**
 * Bandeja de validación: cada tab es un estado del pago. `REPORTADO` es la
 * cola de trabajo real (lo que la escuela tiene que revisar); los otros tres
 * son historial.
 */
export function BandejaPagos({
  pagos,
  estadoActual,
}: {
  pagos: PaginatedPagosDTO;
  estadoActual: string | undefined;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [motivoAbiertoId, setMotivoAbiertoId] = useState<string | null>(null);
  const [accionMotivo, setAccionMotivo] = useState<"RECHAZAR" | "ANULAR" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [detalleAbiertoId, setDetalleAbiertoId] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  function ejecutar(fd: FormData, accion: (fd: FormData) => Promise<ActionResult>) {
    startTransition(async () => {
      const res = await accion(fd);
      if (res.ok) {
        setError(null);
        setMotivoAbiertoId(null);
        setMotivo("");
        setSeleccionados(new Set());
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function aprobar(pagoId: string) {
    const fd = new FormData();
    fd.set("pagoId", pagoId);
    ejecutar(fd, (f) => aprobarPagoAction(undefined, f));
  }

  function alternarSeleccion(pagoId: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(pagoId)) next.delete(pagoId);
      else next.add(pagoId);
      return next;
    });
  }

  function aprobarSeleccionados() {
    startTransition(async () => {
      const fd = new FormData();
      for (const id of seleccionados) fd.append("pagoId", id);
      const res = await aprobarPagosLoteAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setSeleccionados(new Set());
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function confirmarMotivo(pagoId: string) {
    if (motivo.trim().length < 3) {
      setError("Escribe un motivo (mínimo 3 caracteres).");
      return;
    }
    const fd = new FormData();
    fd.set("pagoId", pagoId);
    fd.set("motivo", motivo);
    const accion = accionMotivo === "RECHAZAR" ? rechazarPagoAction : anularPagoAction;
    ejecutar(fd, (f) => accion(undefined, f));
  }

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
        <Link
          href={hrefPestana(undefined)}
          aria-current={estadoActual ? undefined : "page"}
          className={`${FILTRO_BASE} ${
            estadoActual
              ? "border-subtle bg-surface-2 hover:border-brand"
              : "border-brand bg-brand/10 text-brand"
          }`}
        >
          Todos
        </Link>
        {ESTADOS_PAGO.map((e) => (
          <Link
            key={e}
            href={hrefPestana(e)}
            aria-current={estadoActual === e ? "page" : undefined}
            className={`${FILTRO_BASE} ${
              estadoActual === e
                ? "border-brand bg-brand/10 text-brand"
                : "border-subtle bg-surface-2 hover:border-brand"
            }`}
          >
            {ETIQUETA_ESTADO_PAGO[e]}
          </Link>
        ))}
      </nav>

      {error && (
        <p role="alert" className="text-sm text-alerta">
          {error}
        </p>
      )}

      {/* Solo en la pestaña REPORTADO: es la cola de revisión real, y aprobar
          en lote fuera de ahí (por ejemplo desde "Todos") arriesgaría tildar
          pagos que ya están resueltos. */}
      {estadoActual === "REPORTADO" && seleccionados.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-brand/50 bg-brand/10 px-3 py-2 text-sm">
          <span>{seleccionados.size} seleccionado(s)</span>
          <button
            type="button"
            disabled={pending}
            onClick={aprobarSeleccionados}
            className="font-semibold text-pitch hover:underline"
          >
            Aprobar seleccionados
          </button>
        </div>
      )}

      {pagos.items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No hay pagos acá.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {pagos.items.map((p) => {
            const detalleAbierto = detalleAbiertoId === p.id;
            const pidiendoMotivo = motivoAbiertoId === p.id;
            return (
              <Card key={p.id} className="p-0">
                <div className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  {p.estado === "REPORTADO" && (
                    <input
                      type="checkbox"
                      checked={seleccionados.has(p.id)}
                      onChange={() => alternarSeleccion(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Seleccionar para aprobar en lote"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setDetalleAbiertoId(detalleAbierto ? null : p.id)}
                    className="flex flex-1 flex-wrap items-center justify-between gap-2 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tono={TONO[p.estado] ?? "neutral"}>
                        {ETIQUETA_ESTADO_PAGO[p.estado as keyof typeof ETIQUETA_ESTADO_PAGO] ??
                          p.estado}
                      </Badge>
                      <span className="tabular font-semibold">{formatearMonto(p.monto)}</span>
                      <span className="text-muted">
                        · <FechaCalendario iso={p.fechaPago} formato="d MMM yyyy" />
                      </span>
                      <span className="text-muted">
                        · {p.aplicaciones.length} cuota{p.aplicaciones.length === 1 ? "" : "s"}
                      </span>
                      <span className="text-xs text-muted">
                        {p.origen === "ESCUELA" ? "(registrado por la escuela)" : ""}
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {detalleAbierto ? "Ocultar" : "Ver detalle"}
                    </span>
                  </button>
                </div>

                {detalleAbierto && (
                  <div className="space-y-3 border-t border-subtle px-4 py-3 text-sm">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted">
                        Aplicado a
                      </p>
                      <ul className="space-y-1">
                        {p.aplicaciones.map((a) => (
                          <li key={a.membresiaId} className="flex justify-between text-muted">
                            <span>
                              {a.conceptoNombre} · {a.periodo}
                            </span>
                            <span className="tabular">{formatearMonto(a.monto)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted">
                        Cómo se pagó
                      </p>
                      <ul className="space-y-1">
                        {p.medios.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between text-muted"
                          >
                            <span>
                              {etiquetaMedioPago(m.medio)}
                              {m.referencia ? ` · ${m.referencia}` : ""}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="tabular">{formatearMonto(m.monto)}</span>
                              {m.tieneComprobante && (
                                <a
                                  href={`/api/archivos/comprobante/${m.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-brand underline"
                                >
                                  Ver comprobante
                                </a>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {p.nota && <p className="text-muted">Nota de la familia: {p.nota}</p>}
                    {p.motivoRechazo && <p className="text-alerta">Rechazado: {p.motivoRechazo}</p>}
                    {p.motivoAnulacion && (
                      <p className="text-muted">Anulado: {p.motivoAnulacion}</p>
                    )}

                    {p.estado === "REPORTADO" && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => aprobar(p.id)}
                          className="text-xs font-semibold text-pitch hover:underline"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setMotivoAbiertoId(p.id);
                            setAccionMotivo("RECHAZAR");
                            setMotivo("");
                          }}
                          className="text-xs font-semibold text-alerta hover:underline"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                    {p.estado === "APROBADO" && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setMotivoAbiertoId(p.id);
                            setAccionMotivo("ANULAR");
                            setMotivo("");
                          }}
                          className="text-xs font-semibold text-alerta hover:underline"
                        >
                          Anular
                        </button>
                      </div>
                    )}

                    {pidiendoMotivo && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          autoFocus
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Motivo…"
                          maxLength={300}
                          className="min-w-56 flex-1 rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-brand"
                        />
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => confirmarMotivo(p.id)}
                          className="text-xs font-semibold text-alerta hover:underline"
                        >
                          Confirmar {accionMotivo === "RECHAZAR" ? "rechazo" : "anulación"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMotivoAbiertoId(null)}
                          className="text-xs text-muted hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
