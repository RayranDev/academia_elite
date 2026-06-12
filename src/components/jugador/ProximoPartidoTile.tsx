import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trophy, MapPin } from "lucide-react";
import { confirmarConvocatoriaAction } from "@/actions/evento.actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ProximoEventoDTO } from "@/services/evento.service";

export function ProximoPartidoTile({
  evento,
  jugadorId,
}: {
  evento: ProximoEventoDTO;
  jugadorId: string;
}) {
  return (
    <Card className="relative overflow-hidden border-oro/40">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 opacity-10"
      >
        <Trophy className="h-32 w-32 text-oro" />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-oro">
        Próximo partido
      </p>
      <h2 className="mt-1 text-2xl font-display italic uppercase">
        {evento.esLocal ? "vs" : "@"} {evento.rival ?? evento.titulo}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {format(new Date(evento.inicio), "EEEE d 'de' MMMM · HH:mm", { locale: es })}
      </p>
      {evento.canchaNombre && (
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {evento.canchaNombre}
        </p>
      )}

      {evento.convocado && (
        <div className="mt-4 flex items-center gap-2">
          {evento.confirmacion === "CONFIRMADO" ? (
            <Badge tono="pitch">Asistencia confirmada</Badge>
          ) : evento.confirmacion === "RECHAZADO" ? (
            <Badge tono="alerta">No asistirá</Badge>
          ) : (
            <>
              <form action={confirmarConvocatoriaAction}>
                <input type="hidden" name="eventoId" value={evento.id} />
                <input type="hidden" name="jugadorId" value={jugadorId} />
                <input type="hidden" name="confirmacion" value="CONFIRMADO" />
                <button className="rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-base">
                  Confirmar asistencia
                </button>
              </form>
              <form action={confirmarConvocatoriaAction}>
                <input type="hidden" name="eventoId" value={evento.id} />
                <input type="hidden" name="jugadorId" value={jugadorId} />
                <input type="hidden" name="confirmacion" value="RECHAZADO" />
                <button className="rounded-lg border border-subtle px-4 py-2 text-sm text-muted hover:text-foreground">
                  No asistirá
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
