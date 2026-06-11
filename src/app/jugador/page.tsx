import { requireAuthContext } from "@/lib/auth/session";
import { obtenerHub, type HubDTO } from "@/services/player.service";
import { DomainError } from "@/lib/errors";
import { HubHero } from "@/components/jugador/HubHero";
import { ObjetivosList } from "@/components/jugador/ObjetivosList";
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black italic uppercase">
        Carrera de {hub.nombre}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {hub.card ? (
          <HubHero card={hub.card} />
        ) : (
          <Card className="flex min-h-80 items-center justify-center text-center text-muted">
            Aún sin evaluación. Tu primera carta nacerá tras la próxima sesión de
            pruebas.
          </Card>
        )}

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg font-bold">Próximos eventos</h2>
            <UpcomingList eventos={hub.proximos} jugadorId={hub.jugadorId} />
          </Card>
          <ObjetivosList objetivos={hub.objetivos} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {hub.ultimoPartido && (
          <Card>
            <h2 className="mb-2 text-lg font-bold">Último partido</h2>
            <p className="text-sm text-muted">{hub.ultimoPartido.titulo}</p>
            <p className="mt-2 text-4xl font-black tabular">
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
          <h2 className="mb-3 text-lg font-bold">Noticias del club</h2>
          {hub.noticias.length === 0 ? (
            <p className="text-sm text-muted">Sin noticias por ahora.</p>
          ) : (
            <ul className="space-y-3">
              {hub.noticias.map((n) => (
                <li key={n.id} className="border-b border-subtle pb-2">
                  <p className="text-sm font-semibold text-brand">📣 {n.titulo}</p>
                  <p className="text-sm text-muted">{n.cuerpo}</p>
                  <p className="text-[11px] text-muted">
                    {new Date(n.fecha).toLocaleDateString("es")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Evolución</h2>
        <EvolutionChart datos={hub.evolucion} />
      </Card>
    </div>
  );
}
