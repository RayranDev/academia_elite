import { CalendarClock, Newspaper, LineChart, History, Megaphone } from "lucide-react";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerHub, type HubDTO } from "@/services/player.service";
import { DomainError } from "@/lib/errors";
import { HubHero } from "@/components/jugador/HubHero";
import { ObjetivosList } from "@/components/jugador/ObjetivosList";
import { ProximoPartidoTile } from "@/components/jugador/ProximoPartidoTile";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { UpcomingList } from "@/components/calendar/UpcomingList";
import { Card } from "@/components/ui/Card";

async function cargarHub(): Promise<HubDTO | null> {
  const ctx = await requireAuthContext();
  try {
    return await obtenerHub(ctx);
  } catch (e) {
    if (e instanceof DomainError) return null;
    throw e;
  }
}

export default async function JugadorHubPage() {
  const hub = await cargarHub();
  if (!hub) {
    return (
      <Card>
        <p className="text-muted">
          Aún no hay un jugador vinculado a tu cuenta o no fue aprobado todavía.
          Cuando el entrenador apruebe la solicitud, aquí verás su carta.
        </p>
      </Card>
    );
  }

  const partido = hub.proximos.find((p) => p.tipo === "PARTIDO");
  const agenda = hub.proximos.filter((p) => p.id !== partido?.id);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display italic uppercase">
        Carrera de {hub.nombre}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {hub.card ? (
          <HubHero card={hub.card} />
        ) : (
          <Card className="flex min-h-80 w-72 items-center justify-center text-center text-muted">
            Aún sin evaluación. Tu primera carta nacerá tras la próxima sesión de
            pruebas.
          </Card>
        )}

        <div className="space-y-6">
          {partido ? (
            <ProximoPartidoTile evento={partido} jugadorId={hub.jugadorId} />
          ) : null}
          <ObjetivosList objetivos={hub.objetivos} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Encabezado icon={CalendarClock} titulo="Agenda" />
          <UpcomingList eventos={agenda} jugadorId={hub.jugadorId} />
        </Card>

        <Card>
          <Encabezado icon={Newspaper} titulo="Noticias del club" />
          {hub.noticias.length === 0 ? (
            <p className="text-sm text-muted">Sin noticias por ahora.</p>
          ) : (
            <ul className="space-y-3">
              {hub.noticias.map((n) => (
                <li key={n.id} className="flex gap-3 border-b border-subtle pb-3">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold">{n.titulo}</p>
                    <p className="text-sm text-muted">{n.cuerpo}</p>
                    <p className="text-[11px] text-muted">
                      {new Date(n.fecha).toLocaleDateString("es")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {hub.ultimoPartido && (
        <Card className="max-w-sm">
          <Encabezado icon={History} titulo="Último partido" />
          <p className="text-sm text-muted">{hub.ultimoPartido.titulo}</p>
          <p className="mt-1 text-5xl font-display tabular">
            {hub.ultimoPartido.esLocal
              ? `${hub.ultimoPartido.resultadoLocal} - ${hub.ultimoPartido.resultadoVisitante}`
              : `${hub.ultimoPartido.resultadoVisitante} - ${hub.ultimoPartido.resultadoLocal}`}
          </p>
          {hub.ultimoPartido.rival && (
            <p className="text-sm text-muted">
              {hub.ultimoPartido.esLocal ? "vs" : "@"} {hub.ultimoPartido.rival}
            </p>
          )}
        </Card>
      )}

      <Card>
        <Encabezado icon={LineChart} titulo="Evolución" />
        <EvolutionChart datos={hub.evolucion} />
      </Card>
    </div>
  );
}

function Encabezado({
  icon: Icon,
  titulo,
}: {
  icon: typeof CalendarClock;
  titulo: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
      <Icon className="h-5 w-5 text-brand" aria-hidden />
      {titulo}
    </h2>
  );
}
