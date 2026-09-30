import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { Play } from "lucide-react";
import { obtenerDetalleEventoDt, listarCanchasDt } from "@/services/evento.service";
import { DomainError } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { EditarEventoDialog } from "@/components/dt/EditarEventoDialog";
import { CancelarEventoButton } from "@/components/dt/CancelarEventoButton";
import { PasarListaForm } from "@/components/dt/PasarListaForm";
import { ResultadoPartidoForm } from "@/components/dt/ResultadoPartidoForm";
import { EstadisticasPartidoForm } from "@/components/dt/EstadisticasPartidoForm";
import { ETIQUETA_TIPO, ICONO_TIPO, TEXTO_TIPO } from "@/components/calendar/tipos";
import type { TipoEvento } from "@/types";

export default async function EventoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let ev;
  let canchas;
  try {
    [ev, canchas] = await Promise.all([
      obtenerDetalleEventoDt(ctx, id),
      listarCanchasDt(ctx),
    ]);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  const confirmados = ev.convocados.filter((c) => c.confirmacion === "CONFIRMADO").length;

  return (
    <div className="space-y-6">
      <Link href="/dt/eventos" className="text-sm text-muted hover:text-foreground">
        ← Volver a eventos
      </Link>
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-display italic uppercase">
          {(() => {
            const Icon = ICONO_TIPO[ev.tipo as TipoEvento];
            return (
              <Icon
                className={`h-7 w-7 shrink-0 ${TEXTO_TIPO[ev.tipo as TipoEvento]}`}
                aria-hidden
              />
            );
          })()}
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
        {/* Entrada al Modo Sesión (PLAN-UX-DT PR-3 §3.4): además del home "Hoy",
            se entra desde acá. No se ofrece si el evento está cancelado ni si la
            sesión ya se cerró — en ese caso esta misma pantalla es la de consulta
            y corrección. */}
        {!ev.cancelado && !ev.sesionCerradaAt && (
          <Link
            href={`/dt/eventos/${ev.id}/sesion`}
            className={buttonVariants({
              size: "lg",
              className: "mt-3 w-full gap-2 sm:w-auto",
            })}
          >
            <Play className="h-4 w-4" aria-hidden />
            Iniciar sesión
          </Link>
        )}
        {ev.sesionCerradaAt && (
          <p className="mt-3 text-sm text-muted">
            Sesión cerrada el{" "}
            <FechaLocal iso={ev.sesionCerradaAt} formato="d MMM yyyy, HH:mm" />. Los
            cambios que hagas desde acá quedan registrados como corrección.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <EditarEventoDialog
            evento={{
              id: ev.id,
              tipo: ev.tipo,
              titulo: ev.titulo,
              canchaId: ev.canchaId,
              rival: ev.rival,
              esLocal: ev.esLocal,
              inicio: ev.inicio,
              fin: ev.fin,
              notas: ev.notas,
            }}
            canchas={canchas}
          />
          {!ev.cancelado && (
            <CancelarEventoButton
              eventoId={ev.id}
              familias={ev.convocados.length}
            />
          )}
        </div>
      </div>

      {ev.cancelado && (
        <Card className="border-alerta">
          <p className="text-sm font-semibold text-alerta">
            Este evento fue cancelado. Las familias fueron notificadas.
          </p>
        </Card>
      )}

      {ev.convocados.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">
            Convocatoria · {confirmados}/{ev.convocados.length} confirmados
          </h2>
          <div className="flex flex-wrap gap-2">
            {ev.convocados.map((c) => (
              <span
                key={c.jugadorId}
                className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1 text-sm"
              >
                {c.nombre} {c.apellido}
                {c.confirmacion === "CONFIRMADO" ? (
                  <Badge tono="pitch">✓</Badge>
                ) : c.confirmacion === "RECHAZADO" ? (
                  <Badge tono="alerta">✗</Badge>
                ) : (
                  <Badge tono="oro">?</Badge>
                )}
              </span>
            ))}
          </div>
        </Card>
      )}

      {ev.convocados.length > 0 && (
        <Card id="pasar-lista" className="scroll-mt-20">
          <h2 className="mb-3 text-lg font-bold">Pasar lista</h2>
          <PasarListaForm
            eventoId={ev.id}
            convocados={ev.convocados.map((c) => ({
              jugadorId: c.jugadorId,
              nombre: c.nombre,
              apellido: c.apellido,
              presente: c.presente,
            }))}
          />
        </Card>
      )}

      {ev.tipo === "PARTIDO" && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">Resultado</h2>
          {ev.resultadoLocal !== null && (
            <p className="mb-3 text-2xl font-black tabular">
              {ev.resultadoLocal} - {ev.resultadoVisitante}
            </p>
          )}
          <ResultadoPartidoForm
            eventoId={ev.id}
            resultadoLocal={ev.resultadoLocal}
            resultadoVisitante={ev.resultadoVisitante}
          />
        </Card>
      )}

      {ev.tipo === "PARTIDO" && ev.convocados.length > 0 && (
        <Card className="overflow-x-auto">
          <h2 className="mb-1 text-lg font-bold">Estadística individual</h2>
          <p className="mb-3 text-xs text-muted">
            Carga la línea de cada jugador en el partido. Se guarda todo junto.
          </p>
          <EstadisticasPartidoForm eventoId={ev.id} convocados={ev.convocados} />
        </Card>
      )}
    </div>
  );
}
