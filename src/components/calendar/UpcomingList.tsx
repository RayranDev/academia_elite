"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { confirmarConvocatoriaAction } from "@/actions/evento.actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { COLOR_TIPO, ETIQUETA_TIPO, ICONO_TIPO } from "@/components/calendar/tipos";
import type { ProximoEventoDTO } from "@/services/evento.service";
import type { TipoEvento } from "@/types";

export function UpcomingList({
  eventos,
  jugadorId,
}: {
  eventos: ProximoEventoDTO[];
  jugadorId: string;
}) {
  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 10;
  const totalPaginas = Math.ceil(eventos.length / itemsPorPagina);

  if (eventos.length === 0) {
    return <p className="text-sm text-muted">No hay eventos próximos.</p>;
  }

  const inicioIdx = (pagina - 1) * itemsPorPagina;
  const visible = eventos.slice(inicioIdx, inicioIdx + itemsPorPagina);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {visible.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-subtle bg-surface-2 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = ICONO_TIPO[e.tipo as TipoEvento];
                  return (
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: COLOR_TIPO[e.tipo as TipoEvento] }}
                      aria-hidden
                    />
                  );
                })()}
                <span className="font-semibold">{e.titulo}</span>
                {e.tipo === "PARTIDO" && e.rival && (
                  <span className="text-muted">
                    {" "}
                    {e.esLocal ? "vs" : "@"} {e.rival}
                  </span>
                )}
              </div>
              <Badge>{ETIQUETA_TIPO[e.tipo as TipoEvento]}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted">
              {format(new Date(e.inicio), "EEEE d 'de' MMMM · HH:mm", { locale: es })}
              {e.canchaNombre ? ` · ${e.canchaNombre}` : ""}
            </p>

            {e.convocado && (
              <div className="mt-2 flex items-center gap-2">
                {e.confirmacion === "CONFIRMADO" ? (
                  <Badge tono="pitch">Asistencia confirmada</Badge>
                ) : e.confirmacion === "RECHAZADO" ? (
                  <Badge tono="alerta">No asistirá</Badge>
                ) : (
                  <Badge tono="oro">Confirmación pendiente</Badge>
                )}
                <form action={confirmarConvocatoriaAction}>
                  <input type="hidden" name="eventoId" value={e.id} />
                  <input type="hidden" name="jugadorId" value={jugadorId} />
                  <input type="hidden" name="confirmacion" value="CONFIRMADO" />
                  <button className="rounded bg-pitch px-2 py-1 text-xs font-semibold text-base">
                    Confirmar
                  </button>
                </form>
                <form action={confirmarConvocatoriaAction}>
                  <input type="hidden" name="eventoId" value={e.id} />
                  <input type="hidden" name="jugadorId" value={jugadorId} />
                  <input type="hidden" name="confirmacion" value="RECHAZADO" />
                  <button className="rounded border border-subtle px-2 py-1 text-xs text-muted hover:text-foreground">
                    No asistirá
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-subtle pt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
