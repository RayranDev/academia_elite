"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarX2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Paginacion } from "@/components/ui/Paginacion";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { COLOR_TIPO, ETIQUETA_TIPO, ICONO_TIPO } from "@/components/calendar/tipos";
import { TIPOS_EVENTO, ESTADOS_EVENTO, type EstadoEvento, type TipoEvento } from "@/types";
import type { EventoListadoDTO } from "@/services/evento.service";

const ETIQUETA_ESTADO: Record<EstadoEvento, string> = {
  PROGRAMADO: "Programado",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const TONO_ESTADO: Record<EstadoEvento, "neutral" | "pitch" | "info" | "alerta" | "oro"> = {
  PROGRAMADO: "info",
  EN_CURSO: "pitch",
  FINALIZADO: "neutral",
  CANCELADO: "alerta",
};

const input =
  "rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Listado general de eventos (paginado, con filtros de tipo/estado/rango de
 * fechas). Compartido por DT y familia: cada uno ve los eventos de sus propias
 * categorías (el servicio ya lo resuelve), acá solo cambia a dónde linkea cada
 * fila (`basePathDetalle`).
 */
export function EventosListado({
  eventos,
  page,
  totalPages,
  totalItems,
  basePathDetalle,
}: {
  eventos: EventoListadoDTO[];
  page: number;
  totalPages: number;
  totalItems: number;
  basePathDetalle: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiarFiltro(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={searchParams.get("tipo") ?? ""}
          onChange={(e) => cambiarFiltro("tipo", e.target.value)}
          className={input}
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_EVENTO.map((t) => (
            <option key={t} value={t}>{ETIQUETA_TIPO[t as TipoEvento]}</option>
          ))}
        </select>

        <select
          value={searchParams.get("estado") ?? ""}
          onChange={(e) => cambiarFiltro("estado", e.target.value)}
          className={input}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_EVENTO.map((es) => (
            <option key={es} value={es}>{ETIQUETA_ESTADO[es]}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted" htmlFor="desde">Desde</label>
          <input
            id="desde"
            type="date"
            value={searchParams.get("desde") ?? ""}
            onChange={(e) => cambiarFiltro("desde", e.target.value)}
            className={input}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted" htmlFor="hasta">Hasta</label>
          <input
            id="hasta"
            type="date"
            value={searchParams.get("hasta") ?? ""}
            onChange={(e) => cambiarFiltro("hasta", e.target.value)}
            className={input}
          />
        </div>
      </div>

      {eventos.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          titulo="Sin eventos"
          texto="Ningún evento coincide con los filtros elegidos."
        />
      ) : (
        <>
          <ul className="divide-y divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface">
            {eventos.map((e) => {
              const Icon = ICONO_TIPO[e.tipo];
              const marcador =
                e.tipo === "PARTIDO" &&
                e.resultadoLocal !== null &&
                e.resultadoVisitante !== null
                  ? e.esLocal
                    ? `${e.resultadoLocal} - ${e.resultadoVisitante}`
                    : `${e.resultadoVisitante} - ${e.resultadoLocal}`
                  : null;
              return (
                <li key={e.id}>
                  <Link
                    href={`${basePathDetalle}${e.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-surface-2/50"
                  >
                    <Icon
                      className="h-5 w-5 shrink-0"
                      style={{ color: COLOR_TIPO[e.tipo] }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {e.titulo}
                        {e.rival && (
                          <span className="text-muted"> · {e.esLocal ? "vs" : "@"} {e.rival}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {e.categoriaNombre} · <FechaLocal iso={e.inicio} formato="d MMM yyyy, HH:mm" />
                      </p>
                    </div>
                    {marcador && (
                      <span className="shrink-0 font-black tabular">{marcador}</span>
                    )}
                    <Badge tono={TONO_ESTADO[e.estado]}>{ETIQUETA_ESTADO[e.estado]}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Paginacion page={page} totalPages={totalPages} totalItems={totalItems} />
        </>
      )}
    </div>
  );
}
