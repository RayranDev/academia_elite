import { confirmarConvocatoriaAction } from "@/actions/evento.actions";

/**
 * Botón discreto para rectificar una convocatoria ya respondida (a la opción
 * opuesta). Se puede usar las veces que haga falta: la respuesta nunca queda
 * fija. Compartido por ProximoPartidoTile, UpcomingList y el detalle de
 * evento del jugador — antes cada uno la reimplementaba por separado, y el
 * detalle (`/jugador/eventos/[id]`) directamente no la tenía.
 */
export function CambiarRespuesta({
  eventoId,
  jugadorId,
  a,
  texto,
}: {
  eventoId: string;
  jugadorId: string;
  a: "CONFIRMADO" | "RECHAZADO";
  texto: string;
}) {
  return (
    <form action={confirmarConvocatoriaAction}>
      <input type="hidden" name="eventoId" value={eventoId} />
      <input type="hidden" name="jugadorId" value={jugadorId} />
      <input type="hidden" name="confirmacion" value={a} />
      <button className="text-xs font-medium text-muted underline hover:text-foreground">
        {texto}
      </button>
    </form>
  );
}
