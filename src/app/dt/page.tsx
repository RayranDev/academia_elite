import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { requireAuthContext } from "@/lib/auth/session";
import { eventosDeHoyDt, type EventoHoyDTO } from "@/services/evento.service";
import {
  listarPlantillaDt,
  listarSolicitudesDt,
} from "@/services/jugador.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ETIQUETA_TIPO } from "@/components/calendar/tipos";

/**
 * Home del DT: "Hoy" (PLAN-UX-DT PR-2 · B1). Antes aterrizaba en la plantilla y
 * su tarea principal —evaluaciones vencidas— era un número no clickeable. Ahora
 * lo primero es el evento del día, y todo lo demás es accionable de un toque.
 */
export default async function DtHoyPage() {
  const ctx = await requireAuthContext();
  const [eventos, plantilla, solicitudes] = await Promise.all([
    eventosDeHoyDt(ctx),
    listarPlantillaDt(ctx),
    listarSolicitudesDt(ctx),
  ]);

  const vencidas = plantilla.filter((p) => p.vencida);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-display italic uppercase">Hoy</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          {eventos.length === 1 ? "Tu evento de hoy" : "Tus eventos de hoy"}
        </h2>
        {eventos.length === 0 ? (
          <Card>
            <p className="text-muted">
              No tenés eventos hoy.{" "}
              <Link href="/dt/calendario" className="font-semibold text-brand hover:underline">
                Ver el calendario →
              </Link>
            </p>
          </Card>
        ) : (
          eventos.map((ev) => <EventoHoy key={ev.id} ev={ev} />)
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Evaluaciones vencidas</h2>
          {vencidas.length > 0 && <Badge tono="alerta">{vencidas.length}</Badge>}
        </div>
        {vencidas.length === 0 ? (
          <Card>
            <p className="text-muted">Ninguna evaluación vencida. Al día. 👏</p>
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
                <Link href={`/dt/jugadores/${j.id}/evaluar`} className="shrink-0">
                  <Button size="sm">Evaluar →</Button>
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
            <Link href="/dt/solicitudes" className="shrink-0">
              <Button size="sm" variant="secondary">
                Revisar →
              </Button>
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
}

/** Tarjeta del evento del día con la acción principal: arrancar la sesión. */
function EventoHoy({ ev }: { ev: EventoHoyDTO }) {
  const hora = format(new Date(ev.inicio), "HH:mm", { locale: es });
  const cerrado = ev.sesionCerradaAt !== null;
  const etiqueta = ETIQUETA_TIPO[ev.tipo] ?? ev.tipo;

  return (
    <Card className={ev.cancelado ? "border-alerta/50" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            {hora} · {etiqueta} · {ev.categoriaNombre}
          </p>
          <h3 className="mt-0.5 text-xl font-display italic uppercase">
            {ev.titulo}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {ev.convocados}{" "}
            {ev.convocados === 1 ? "convocado" : "convocados"}
            {cerrado && " · sesión cerrada"}
          </p>
        </div>
        {ev.cancelado ? (
          <Badge tono="alerta">Cancelado</Badge>
        ) : (
          <Link href={`/dt/eventos/${ev.id}/sesion`} className="w-full sm:w-auto">
            <Button size="lg" className="w-full">
              {cerrado ? "Ver sesión" : `▶ Iniciar ${etiqueta.toLowerCase()}`}
            </Button>
          </Link>
        )}
      </div>
      <div className="mt-3">
        <Link
          href={`/dt/eventos/${ev.id}`}
          className="text-xs font-semibold text-muted hover:text-foreground"
        >
          Ver detalle del evento →
        </Link>
      </div>
    </Card>
  );
}
