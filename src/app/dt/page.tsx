import Link from "next/link";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { requireAuthContext } from "@/lib/auth/session";
import { eventosDeHoyDt, obtenerProximoEventoDt } from "@/services/evento.service";
import {
  listarPlantillaDt,
  listarSolicitudesDt,
} from "@/services/jugador.service";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventoHoyCard } from "@/components/dt/EventoHoyCard";
import { ProximoEventoCard } from "@/components/dt/ProximoEventoCard";
import { eventoDestacadoId } from "@/lib/eventos/hoy";
import { ZONA_ESCUELA } from "@/lib/fecha-calendario";

/** "miércoles 30 de septiembre" en el día de la ESCUELA (no el del servidor). */
function diaLegible(): string {
  const texto = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ZONA_ESCUELA,
  }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Home del DT: "Hoy" (PLAN-UX-DT PR-2 · B1). Lo primero es el evento del día y
 * cada tarjeta trae la acción que corresponde a su fase (iniciar, continuar o
 * ver resumen, más pasar lista): el DT llega a la cancha en un toque, sin
 * pasar por el calendario. Todo lo demás también es accionable.
 */
export default async function DtHoyPage() {
  const ctx = await requireAuthContext();
  const [eventos, proximo, plantilla, solicitudes] = await Promise.all([
    eventosDeHoyDt(ctx),
    obtenerProximoEventoDt(ctx),
    listarPlantillaDt(ctx),
    listarSolicitudesDt(ctx),
  ]);

  const vencidas = plantilla.filter((p) => p.vencida);
  const destacadoId = eventoDestacadoId(eventos);
  // Sin nada pendiente hoy (día libre, o todo cerrado o cancelado): se muestra
  // lo que viene, para que el home nunca sea una pantalla muerta.
  const nadaPendiente = destacadoId === null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display italic uppercase">Hoy</h1>
        <p className="text-sm text-muted">{diaLegible()}</p>
      </div>

      <section className="space-y-3" aria-labelledby="titulo-eventos-hoy">
        <h2 id="titulo-eventos-hoy" className="text-lg font-bold">
          {eventos.length === 1 ? "Tu evento de hoy" : "Tus eventos de hoy"}
        </h2>
        {eventos.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            titulo="Hoy no tienes eventos"
            texto="Día libre para ti. Abajo puedes ver lo que viene."
          >
            <Link
              href="/dt/calendario"
              className={buttonVariants({ variant: "secondary" })}
            >
              Abrir calendario
            </Link>
          </EmptyState>
        ) : (
          eventos.map((ev) => (
            <EventoHoyCard key={ev.id} ev={ev} destacado={ev.id === destacadoId} />
          ))
        )}
      </section>

      {nadaPendiente && proximo && (
        <section className="space-y-3" aria-labelledby="titulo-proximo">
          <h2 id="titulo-proximo" className="text-lg font-bold">
            Lo que viene
          </h2>
          <ProximoEventoCard ev={proximo} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Evaluaciones vencidas</h2>
          {vencidas.length > 0 && <Badge tono="alerta">{vencidas.length}</Badge>}
        </div>
        {vencidas.length === 0 ? (
          <Card className="flex items-center gap-2 text-muted">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-pitch" aria-hidden />
            <p>Ninguna evaluación vencida. Todo al día.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-subtle p-0">
            {vencidas.map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {j.nombre} {j.apellido}
                  </p>
                  <p className="text-xs text-muted">{j.categoriaNombre}</p>
                </div>
                <Link
                  href={`/dt/jugadores/${j.id}/evaluar`}
                  className={buttonVariants({ size: "sm", className: "shrink-0" })}
                >
                  Evaluar →
                </Link>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Solicitudes</h2>
          {solicitudes.length > 0 && (
            <Badge tono="pitch">{solicitudes.length}</Badge>
          )}
        </div>
        {solicitudes.length === 0 ? (
          <Card>
            <p className="text-muted">No hay solicitudes pendientes.</p>
          </Card>
        ) : (
          <Card className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {solicitudes.length}{" "}
              {solicitudes.length === 1
                ? "familia espera aprobación"
                : "familias esperan aprobación"}
              .
            </p>
            <Link
              href="/dt/solicitudes"
              className={buttonVariants({
                size: "sm",
                variant: "secondary",
                className: "shrink-0",
              })}
            >
              Revisar →
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
}
