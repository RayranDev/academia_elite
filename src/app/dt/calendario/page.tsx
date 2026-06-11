import { startOfMonth, endOfMonth, addMonths } from "date-fns";
import { requireAuthContext } from "@/lib/auth/session";
import { listarCalendarioDt } from "@/services/evento.service";
import {
  listarCategoriasDelDt,
  listarActivosDt,
} from "@/services/jugador.service";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { CrearEventoDialog } from "@/components/dt/CrearEventoDialog";

export default async function CalendarioPage() {
  const ctx = await requireAuthContext();
  const desde = startOfMonth(addMonths(new Date(), -1));
  const hasta = endOfMonth(addMonths(new Date(), 2));
  const [eventos, categorias, jugadores] = await Promise.all([
    listarCalendarioDt(ctx, desde, hasta),
    listarCategoriasDelDt(ctx),
    listarActivosDt(ctx),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic uppercase">Calendario</h1>
        <CrearEventoDialog categorias={categorias} jugadores={jugadores} />
      </div>
      <MonthGrid eventos={eventos} />
    </div>
  );
}
