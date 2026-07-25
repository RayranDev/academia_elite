"use client";

import { useEffect, useMemo, useState } from "react";
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
  isToday,
  isBefore,
  startOfDay,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { COLOR_TIPO, ETIQUETA_TIPO, ICONO_TIPO } from "@/components/calendar/tipos";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { cn } from "@/lib/cn";
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

  // "new Date()" da un resultado distinto en el servidor (SSR, UTC) y en el
  // cliente (zona horaria real) al hidratar, así que el mes/día iniciales
  // pueden no coincidir y disparar un error de hidratación. Se difiere el
  // render del calendario a después de montar en el cliente, donde "ahora" ya
  // es consistente consigo mismo.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  const dias = useMemo(() => {
    const ini = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ini, end: fin });
  }, [mes]);

  const eventosPorDia = (dia: Date) =>
    eventos.filter((e) => isSameDay(new Date(e.inicio), dia));

  const delDiaSel = diaSel ? eventosPorDia(diaSel) : [];

  if (!montado) {
    return <div className="h-96" aria-hidden />;
  }

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

        {/* Leyenda ARRIBA de la grilla: al pie obligaba a desplazarse para saber
            qué significaba cada icono. */}
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
          {(Object.keys(COLOR_TIPO) as TipoEvento[]).map((t) => {
            const Icon = ICONO_TIPO[t];
            return (
              <span key={t} className="flex items-center gap-1">
                <Icon className="h-4 w-4" style={{ color: COLOR_TIPO[t] }} aria-hidden />
                {ETIQUETA_TIPO[t]}
              </span>
            );
          })}
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
            const hoy = isToday(dia);
            const delMes = isSameMonth(dia, mes);
            // Día ya transcurrido DENTRO del mes visible: se distingue con un
            // fondo propio (no solo opacidad, que en tema claro casi no se nota)
            // para que la vista se lea de un vistazo: pasado / hoy / futuro.
            const pasado = delMes && !hoy && isBefore(dia, startOfDay(new Date()));
            // Estados mutuamente excluyentes: nunca se pisan dos fondos entre sí
            // (antes bg-surface-2 y opacity-55 convivían sin garantía de orden).
            const estado = !delMes
              ? "border-subtle bg-surface opacity-40"
              : hoy
                ? "border-2 border-oro bg-oro/15"
                : pasado
                  ? "border-subtle bg-surface"
                  : "border-subtle bg-surface-2";
            return (
              <button
                key={dia.toISOString()}
                onClick={() => setDiaSel(dia)}
                aria-current={hoy ? "date" : undefined}
                className={cn(
                  "flex aspect-square flex-col items-center rounded-lg border p-1 text-xs",
                  estado,
                  // La selección se superpone como anillo: no reemplaza el
                  // estado (pasado/hoy/futuro) sigue siendo visible debajo.
                  activo && "ring-2 ring-brand ring-inset",
                )}
              >
                <span
                  className={cn(
                    hoy && "font-black text-oro",
                    pasado && "text-muted",
                  )}
                >
                  {format(dia, "d")}
                </span>
                {/* Iconos centrados en la celda y un poco más grandes: antes
                    quedaban chicos y pegados abajo. */}
                <span className="flex flex-1 items-center justify-center gap-0.5 overflow-visible">
                  {evs.slice(0, 3).map((e) => {
                    const Icon = ICONO_TIPO[e.tipo as TipoEvento];
                    return (
                      <Icon
                        key={e.id}
                        className={cn("h-6 w-6 shrink-0 drop-shadow-sm", pasado && "opacity-60")}
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
                  <FechaLocal iso={e.inicio} formato="HH:mm" /> · {e.titulo}
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
