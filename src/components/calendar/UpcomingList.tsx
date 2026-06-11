import { format } from "date-fns";
import { es } from "date-fns/locale";
import { confirmarConvocatoriaAction } from "@/actions/evento.actions";
import { Badge } from "@/components/ui/Badge";
import { COLOR_TIPO, ETIQUETA_TIPO } from "@/components/calendar/tipos";
import type { ProximoEventoDTO } from "@/services/evento.service";
import type { TipoEvento } from "@/types";

export function UpcomingList({
  eventos,
  jugadorId,
}: {
  eventos: ProximoEventoDTO[];
  jugadorId: string;
}) {
  if (eventos.length === 0) {
    return <p className="text-sm text-muted">No hay eventos próximos.</p>;
  }
  return (
    <ul className="space-y-3">
      {eventos.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-subtle bg-surface-2 p-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                style={{ background: COLOR_TIPO[e.tipo as TipoEvento] }}
              />
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
  );
}
