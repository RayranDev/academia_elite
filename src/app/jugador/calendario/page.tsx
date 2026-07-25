import Link from "next/link";
import { startOfMonth, endOfMonth, addMonths } from "date-fns";
import { requireAuthContext } from "@/lib/auth/session";
import { listarCalendarioJugador } from "@/services/evento.service";
import { MonthGrid } from "@/components/calendar/MonthGrid";

export default async function CalendarioJugadorPage() {
  const ctx = await requireAuthContext();
  const desde = startOfMonth(addMonths(new Date(), -1));
  const hasta = endOfMonth(addMonths(new Date(), 2));
  const eventos = await listarCalendarioJugador(ctx, desde, hasta);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Calendario</h1>
        <Link href="/jugador/eventos" className="text-sm font-semibold text-brand hover:underline">
          Ver todos los eventos →
        </Link>
      </div>
      <p className="text-sm text-muted">
        Entrenamientos, partidos y eventos de la categoría de tu hijo/a.
      </p>
      {/* La familia abre su propio detalle (confirmar convocatoria, ver resultado). */}
      <MonthGrid eventos={eventos} eventoBase="/jugador/eventos/" />
    </div>
  );
}
