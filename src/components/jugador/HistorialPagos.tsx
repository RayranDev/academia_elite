"use client";

import { useState } from "react";
import { ETIQUETA_ESTADO_PAGO } from "@/lib/validators/pago";
import { etiquetaMedioPago } from "@/lib/validators/membresia";
import { formatearMonto } from "@/lib/cobranza";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FechaCalendario } from "@/components/ui/FechaCalendario";
import type { PagoDTO } from "@/services/pago.service";

const TONO: Record<string, "pitch" | "oro" | "alerta" | "neutral"> = {
  REPORTADO: "oro",
  APROBADO: "pitch",
  RECHAZADO: "alerta",
  ANULADO: "neutral",
};

export function HistorialPagos({ pagos }: { pagos: PagoDTO[] }) {
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  if (pagos.length === 0) {
    return (
      <Card>
        <h2 className="mb-2 text-lg font-bold">Tus pagos reportados</h2>
        <p className="text-sm text-muted">Todavía no reportaste ningún pago.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">Tus pagos reportados</h2>
      <div className="space-y-2">
        {pagos.map((p) => {
          const abierto = abiertoId === p.id;
          return (
            <div key={p.id} className="rounded-lg border border-subtle">
              <button
                type="button"
                onClick={() => setAbiertoId(abierto ? null : p.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
              >
                <span className="flex items-center gap-2">
                  <Badge tono={TONO[p.estado] ?? "neutral"}>
                    {ETIQUETA_ESTADO_PAGO[p.estado as keyof typeof ETIQUETA_ESTADO_PAGO] ??
                      p.estado}
                  </Badge>
                  <span className="tabular">{formatearMonto(p.monto)}</span>
                  <span className="text-muted">
                    · <FechaCalendario iso={p.fechaPago} formato="d MMM yyyy" />
                  </span>
                </span>
                <span className="text-xs text-muted">{abierto ? "Ocultar" : "Ver detalle"}</span>
              </button>
              {abierto && (
                <div className="space-y-3 border-t border-subtle px-3 py-3 text-sm">
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
                        <li key={m.id} className="flex items-center justify-between text-muted">
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
                  {p.estado === "RECHAZADO" && p.motivoRechazo && (
                    <p className="text-alerta">Motivo del rechazo: {p.motivoRechazo}</p>
                  )}
                  {p.estado === "ANULADO" && p.motivoAnulacion && (
                    <p className="text-muted">Motivo de la anulación: {p.motivoAnulacion}</p>
                  )}
                  {p.nota && <p className="text-muted">Nota: {p.nota}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
