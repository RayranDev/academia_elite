import Link from "next/link";
import { startOfMonth, endOfMonth, addMonths } from "date-fns";
import { requireAuthContext } from "@/lib/auth/session";
import {
  listarCalendarioDt,
  listarCanchasDt,
  type EventoCalendarioDTO,
} from "@/services/evento.service";
import {
  listarCategoriasDelDt,
  listarActivosDt,
} from "@/services/jugador.service";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { CrearEventoDialog } from "@/components/dt/CrearEventoDialog";
import { Card } from "@/components/ui/Card";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { ETIQUETA_TIPO, FONDO_TIPO } from "@/components/calendar/tipos";
import type { TipoEvento } from "@/types";

function proximosEventos(
  eventos: EventoCalendarioDTO[],
): EventoCalendarioDTO[] {
  const ahora = Date.now();
  return eventos
    .filter((e) => new Date(e.inicio).getTime() >= ahora)
    .slice(0, 8);
}

export default async function CalendarioPage() {
  const ctx = await requireAuthContext();
  const desde = startOfMonth(addMonths(new Date(), -1));
  const hasta = endOfMonth(addMonths(new Date(), 2));
  const [eventos, categorias, jugadores, canchas] = await Promise.all([
    listarCalendarioDt(ctx, desde, hasta),
    listarCategoriasDelDt(ctx),
    listarActivosDt(ctx),
    listarCanchasDt(ctx),
  ]);
  const proximos = proximosEventos(eventos);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Calendario</h1>
        <div className="flex items-center gap-3">
          <Link href="/dt/eventos" className="text-sm font-semibold text-brand hover:underline">
            Ver todos los eventos →
          </Link>
          <CrearEventoDialog categorias={categorias} jugadores={jugadores} canchas={canchas} />
        </div>
      </div>
      <MonthGrid eventos={eventos} eventoBase="/dt/eventos/" />

      <Card>
        <h2 className="mb-3 text-lg font-bold">Próximos eventos</h2>
        {proximos.length === 0 ? (
          <p className="text-sm text-muted">No hay eventos próximos.</p>
        ) : (
          <ul className="space-y-2">
            {proximos.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/dt/eventos/${e.id}`}
                  className="flex items-center justify-between rounded-lg bg-surface-2 p-3 text-sm hover:bg-subtle"
                >
                  <span>
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${FONDO_TIPO[e.tipo as TipoEvento]}`}
                    />
                    {e.titulo}{" "}
                    <span className="text-muted">
                      · {e.categoriaNombre} · {ETIQUETA_TIPO[e.tipo as TipoEvento]}
                    </span>
                  </span>
                  <span className="text-xs text-muted">
                    <FechaLocal iso={e.inicio} formato="d MMM HH:mm" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
