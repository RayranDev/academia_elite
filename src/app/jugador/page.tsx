import { requireAuthContext } from "@/lib/auth/session";
import { obtenerHub, type HubDTO } from "@/services/player.service";
import { DomainError } from "@/lib/errors";
import { HubHero } from "@/components/jugador/HubHero";
import { ObjetivosList } from "@/components/jugador/ObjetivosList";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
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
          {/* Próximos eventos / noticias del club llegan en el Sprint 6 */}
          <Card className="border-dashed">
            <h2 className="text-lg font-bold">Próximos partidos y noticias</h2>
            <p className="mt-1 text-sm text-muted">
              El calendario, las convocatorias y las noticias del club se activan
              en el siguiente sprint.
            </p>
          </Card>
          <ObjetivosList objetivos={hub.objetivos} />
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Evolución</h2>
        <EvolutionChart datos={hub.evolucion} />
      </Card>
    </div>
  );
}
