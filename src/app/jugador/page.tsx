import { CalendarClock, Newspaper, LineChart, History, Trophy, TrendingUp } from "lucide-react";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerHub, type HubDTO } from "@/services/player.service";
import { DomainError } from "@/lib/errors";
import { HubHero } from "@/components/jugador/HubHero";
import { ObjetivosList } from "@/components/jugador/ObjetivosList";
import { ProximoPartidoTile } from "@/components/jugador/ProximoPartidoTile";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { UpcomingList } from "@/components/calendar/UpcomingList";
import { NoticiasList } from "@/components/jugador/NoticiasList";
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
          <CrecimientoTile
            asistencias={hub.asistenciasCurva}
            proyeccion={hub.proyeccionCurva}
          />
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
          <NoticiasList noticias={hub.noticias} />
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

      {hub.resumenPartidos.partidos > 0 && (
        <Card>
          <Encabezado icon={Trophy} titulo="Resumen de partidos" />
          <dl className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
            <ResumenStat label="Partidos" value={hub.resumenPartidos.partidos} />
            <ResumenStat label="Goles" value={hub.resumenPartidos.goles} />
            <ResumenStat label="Asistencias" value={hub.resumenPartidos.asistencias} />
            <ResumenStat label="Minutos" value={hub.resumenPartidos.minutos} />
            <ResumenStat label="Amarillas" value={hub.resumenPartidos.amarillas} />
            <ResumenStat label="Rojas" value={hub.resumenPartidos.rojas} />
          </dl>
          {hub.resumenPartidos.ultimos.length > 0 && (
            <ul className="mt-4 space-y-2">
              {hub.resumenPartidos.ultimos.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-subtle pb-2 text-sm last:border-0"
                >
                  <span>
                    {p.titulo}
                    {p.rival ? <span className="text-muted"> · {p.rival}</span> : null}
                  </span>
                  <span className="text-muted">
                    {p.goles}G · {p.asistencias}A ·{" "}
                    {new Date(p.inicio).toLocaleDateString("es")}
                  </span>
                </li>
              ))}
            </ul>
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

function ResumenStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-2 py-2">
      <dd className="text-2xl font-bold tabular">{value}</dd>
      <dt className="text-[10px] uppercase tracking-wide text-muted">{label}</dt>
    </div>
  );
}

/** Mensaje motivacional: cómo el esfuerzo reciente hace crecer la carta (MEN). */
function CrecimientoTile({
  asistencias,
  proyeccion,
}: {
  asistencias: HubDTO["asistenciasCurva"];
  proyeccion: HubDTO["proyeccionCurva"];
}) {
  return (
    <Card className="border-pitch/40">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <TrendingUp className="h-5 w-5 text-pitch" aria-hidden />
        Tu carta crece con tu esfuerzo
      </h2>
      <p className="mt-2 text-sm text-muted">
        Últimos 30 días:{" "}
        <span className="font-bold text-foreground">{asistencias.entrenos}</span>{" "}
        entrenamientos y{" "}
        <span className="font-bold text-foreground">{asistencias.partidos}</span>{" "}
        partidos.
      </p>
      <p className="mt-1 text-sm">
        Llevás{" "}
        <span className="font-bold text-pitch">+{proyeccion.bonusActual}</span> de
        MEN ganados por asistir{" "}
        <span className="text-muted">(tope +{proyeccion.tope}, ya incluido en tu carta)</span>.
      </p>
      {proyeccion.frenadoPorAusencias ? (
        <p className="mt-2 text-sm text-alerta">
          Tus faltas están frenando tu crecimiento. Volvé a entrenar y lo
          recuperás enseguida.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Cada entrenamiento suma +{proyeccion.gananciaProximoEntreno} y cada
          partido +{proyeccion.gananciaProximoPartido} a tu MEN. ¡No faltes y
          tu carta sigue subiendo sin esperar a la próxima medición!
        </p>
      )}
    </Card>
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
