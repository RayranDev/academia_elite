import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerDetalleEventoJugador } from "@/services/evento.service";
import { confirmarConvocatoriaAction } from "@/actions/evento.actions";
import { DomainError } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { CambiarRespuesta } from "@/components/eventos/CambiarRespuesta";
import { ETIQUETA_TIPO, ICONO_TIPO, TEXTO_TIPO } from "@/components/calendar/tipos";
import type { TipoEvento } from "@/types";

export default async function EventoJugadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let ev;
  try {
    ev = await obtenerDetalleEventoJugador(ctx, id);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  const Icon = ICONO_TIPO[ev.tipo as TipoEvento];
  const hayResultado = ev.resultadoLocal !== null && ev.resultadoVisitante !== null;

  return (
    <div className="space-y-6">
      <Link href="/jugador/eventos" className="text-sm text-muted hover:text-foreground">
        ← Volver a eventos
      </Link>
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-display italic uppercase">
          <Icon
            className={`h-7 w-7 shrink-0 ${TEXTO_TIPO[ev.tipo as TipoEvento]}`}
            aria-hidden
          />
          {ev.titulo}
        </h1>
        <p className="text-sm text-muted">
          {ETIQUETA_TIPO[ev.tipo as TipoEvento]} · {ev.categoriaNombre} ·{" "}
          <FechaLocal iso={ev.inicio} formato="EEEE d 'de' MMMM · HH:mm" />
          {ev.canchaNombre ? ` · ${ev.canchaNombre}` : ""}
        </p>
        {ev.rival && (
          <p className="text-sm text-muted">
            {ev.esLocal ? "Local" : "Visitante"} ante {ev.rival}
          </p>
        )}
      </div>

      {ev.cancelado && (
        <Card className="border-alerta">
          <p className="text-sm font-semibold text-alerta">Este evento fue cancelado.</p>
        </Card>
      )}

      {hayResultado && (
        <Card>
          <h2 className="mb-1 text-lg font-bold">Resultado</h2>
          <p className="text-2xl font-black tabular">
            {ev.resultadoLocal} - {ev.resultadoVisitante}
          </p>
        </Card>
      )}

      {ev.misHijos.map((h) => (
        <Card key={h.jugadorId} className="space-y-3">
          <h2 className="text-lg font-bold">
            {h.nombre} {h.apellido}
          </h2>

          {!ev.cancelado && (
            <div className="flex items-center gap-2">
              {h.confirmacion === "CONFIRMADO" ? (
                <>
                  <Badge tono="pitch">Asistencia confirmada</Badge>
                  <CambiarRespuesta
                    eventoId={ev.id}
                    jugadorId={h.jugadorId}
                    a="RECHAZADO"
                    texto="Cambiar: no asistiré"
                  />
                </>
              ) : h.confirmacion === "RECHAZADO" ? (
                <>
                  <Badge tono="alerta">No asistirá</Badge>
                  <CambiarRespuesta
                    eventoId={ev.id}
                    jugadorId={h.jugadorId}
                    a="CONFIRMADO"
                    texto="Cambiar: confirmar asistencia"
                  />
                </>
              ) : (
                <>
                  <form action={confirmarConvocatoriaAction}>
                    <input type="hidden" name="eventoId" value={ev.id} />
                    <input type="hidden" name="jugadorId" value={h.jugadorId} />
                    <input type="hidden" name="confirmacion" value="CONFIRMADO" />
                    <button className="rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-base">
                      Confirmar asistencia
                    </button>
                  </form>
                  <form action={confirmarConvocatoriaAction}>
                    <input type="hidden" name="eventoId" value={ev.id} />
                    <input type="hidden" name="jugadorId" value={h.jugadorId} />
                    <input type="hidden" name="confirmacion" value="RECHAZADO" />
                    <button className="rounded-lg border border-subtle px-4 py-2 text-sm text-muted hover:text-foreground">
                      No asistirá
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {h.estadistica && (
            <dl className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
              <Stat label="Titular" value={h.estadistica.titular ? "Sí" : "No"} />
              <Stat label="Minutos" value={h.estadistica.minutos} />
              <Stat label="Goles" value={h.estadistica.goles} />
              <Stat label="Asist." value={h.estadistica.asistencias} />
              <Stat label="Amar." value={h.estadistica.amarillas} />
              <Stat label="Roja" value={h.estadistica.roja ? "Sí" : "No"} />
            </dl>
          )}

          {h.observaciones.length > 0 && (
            <div className="space-y-2 border-t border-subtle pt-3">
              <h3 className="text-sm font-bold">Notas del entrenador</h3>
              {h.observaciones.map((o, i) => (
                <p key={i} className="rounded-lg bg-surface-2 p-2 text-sm">
                  {o.texto}
                  <span className="ml-2 text-xs text-muted">
                    <FechaLocal iso={o.fecha} />
                  </span>
                </p>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface-2 py-2">
      <dd className="text-lg font-bold tabular">{value}</dd>
      <dt className="text-[10px] uppercase tracking-wide text-muted">{label}</dt>
    </div>
  );
}
