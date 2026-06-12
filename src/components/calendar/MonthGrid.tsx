"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { COLOR_TIPO, ETIQUETA_TIPO, ICONO_TIPO } from "@/components/calendar/tipos";
import type { EventoCalendarioDTO } from "@/services/evento.service";
import type { TipoEvento } from "@/types";

export function MonthGrid({
  eventos,
  eventoBase,
}: {
  eventos: EventoCalendarioDTO[];
  /** Base de URL para enlazar cada evento (p. ej. "/dt/eventos/"). Si se
   *  omite, el panel lateral muestra los eventos sin enlace (familia). */
  eventoBase?: string;
}) {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [diaSel, setDiaSel] = useState<Date | null>(null);

  const dias = useMemo(() => {
    const ini = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ini, end: fin });
  }, [mes]);

  const eventosPorDia = (dia: Date) =>
    eventos.filter((e) => isSameDay(new Date(e.inicio), dia));

  const delDiaSel = diaSel ? eventosPorDia(diaSel) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold capitalize">
            {format(mes, "MMMM yyyy", { locale: es })}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => setMes(addMonths(mes, -1))}
              className="rounded bg-surface-2 px-3 py-1 text-sm hover:bg-subtle"
            >
              ←
            </button>
            <button
              onClick={() => setMes(startOfMonth(new Date()))}
              className="rounded bg-surface-2 px-3 py-1 text-sm hover:bg-subtle"
            >
              Hoy
            </button>
            <button
              onClick={() => setMes(addMonths(mes, 1))}
              className="rounded bg-surface-2 px-3 py-1 text-sm hover:bg-subtle"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((dia) => {
            const evs = eventosPorDia(dia);
            const activo = diaSel && isSameDay(dia, diaSel);
            return (
              <button
                key={dia.toISOString()}
                onClick={() => setDiaSel(dia)}
                className={`flex aspect-square flex-col items-center rounded-lg border p-1 text-xs ${
                  activo ? "border-brand" : "border-subtle"
                } ${isSameMonth(dia, mes) ? "bg-surface-2" : "bg-surface opacity-40"}`}
              >
                <span>{format(dia, "d")}</span>
                <span className="mt-auto flex items-center gap-0.5 overflow-visible">
                  {evs.slice(0, 3).map((e) => {
                    const Icon = ICONO_TIPO[e.tipo as TipoEvento];
                    return (
                      <Icon
                        key={e.id}
                        className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                        style={{ color: COLOR_TIPO[e.tipo as TipoEvento] }}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    );
                  })}
                  {evs.length > 3 && (
                    <span className="text-[10px] font-bold text-muted">+{evs.length - 3}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          {(Object.keys(COLOR_TIPO) as TipoEvento[]).map((t) => {
            const Icon = ICONO_TIPO[t];
            return (
              <span key={t} className="flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" style={{ color: COLOR_TIPO[t] }} aria-hidden />
                {ETIQUETA_TIPO[t]}
              </span>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-subtle bg-surface p-4">
        <h3 className="mb-2 text-sm font-bold">
          {diaSel
            ? format(diaSel, "EEEE d 'de' MMMM", { locale: es })
            : "Elige un día"}
        </h3>
        {diaSel && delDiaSel.length === 0 && (
          <p className="text-sm text-muted">Sin eventos.</p>
        )}
        <ul className="space-y-2">
          {delDiaSel.map((e) => {
            const Icon = ICONO_TIPO[e.tipo as TipoEvento];
            const contenido = (
              <>
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: COLOR_TIPO[e.tipo as TipoEvento] }}
                  aria-hidden
                />
                <span>
                  {format(new Date(e.inicio), "HH:mm")} · {e.titulo}
                </span>
              </>
            );
            const clase = "flex items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm";
            return (
              <li key={e.id}>
                {eventoBase ? (
                  <Link href={`${eventoBase}${e.id}`} className={`${clase} hover:bg-subtle`}>
                    {contenido}
                  </Link>
                ) : (
                  <div className={clase}>{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
