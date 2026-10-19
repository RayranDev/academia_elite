import { Trophy, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { RespuestaConvocatoria } from "@/components/eventos/RespuestaConvocatoria";
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
        <FechaLocal iso={evento.inicio} formato="EEEE d 'de' MMMM · HH:mm" />
      </p>
      {evento.canchaNombre && (
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {evento.canchaNombre}
        </p>
      )}

      {evento.convocado && (
        <div className="mt-4">
          {/* Estado + botones para responder o rectificar, con feedback visible
              (carga, éxito, error). */}
          <RespuestaConvocatoria
            eventoId={evento.id}
            jugadorId={jugadorId}
            confirmacion={evento.confirmacion}
          />
        </div>
      )}
    </Card>
  );
}
