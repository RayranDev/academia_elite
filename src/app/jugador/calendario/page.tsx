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
      <h1 className="text-3xl font-black italic uppercase">Calendario</h1>
      <p className="text-sm text-muted">
        Entrenamientos, partidos y eventos de la categoría de tu hijo/a.
      </p>
      {/* Sin eventoHref: la familia no abre el detalle de gestión del DT. */}
      <MonthGrid eventos={eventos} />
    </div>
  );
}
