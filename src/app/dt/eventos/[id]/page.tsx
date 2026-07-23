import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerDetalleEventoDt, listarCanchasDt } from "@/services/evento.service";
import { DomainError } from "@/lib/errors";
import {
  pasarListaAction,
  cargarResultadoAction,
  cargarEstadisticasAction,
} from "@/actions/evento.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EditarEventoDialog } from "@/components/dt/EditarEventoDialog";
import { CancelarEventoButton } from "@/components/dt/CancelarEventoButton";
import { ETIQUETA_TIPO, ICONO_TIPO, COLOR_TIPO } from "@/components/calendar/tipos";
import type { TipoEvento } from "@/types";

const numInput =
  "w-16 rounded-lg border border-subtle bg-surface-2 px-2 py-1.5 text-sm tabular outline-none focus:border-brand";

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
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-display italic uppercase">
          {(() => {
            const Icon = ICONO_TIPO[ev.tipo as TipoEvento];
            return (
              <Icon
                className="h-7 w-7 shrink-0"
                style={{ color: COLOR_TIPO[ev.tipo as TipoEvento] }}
                aria-hidden
              />
            );
          })()}
          {ev.titulo}
        </h1>
        <p className="text-sm text-muted">
          {ETIQUETA_TIPO[ev.tipo as TipoEvento]} · {ev.categoriaNombre} ·{" "}
          {format(new Date(ev.inicio), "EEEE d 'de' MMMM · HH:mm", { locale: es })}
          {ev.canchaNombre ? ` · ${ev.canchaNombre}` : ""}
        </p>
        {ev.rival && (
          <p className="text-sm text-muted">
            {ev.esLocal ? "Local" : "Visitante"} ante {ev.rival}
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
        <Card>
          <h2 className="mb-3 text-lg font-bold">Pasar lista</h2>
          <form action={pasarListaAction} className="space-y-2">
            <input type="hidden" name="eventoId" value={ev.id} />
            {ev.convocados.map((c) => (
              <label key={c.jugadorId} className="flex items-center gap-2 text-sm">
                <input type="hidden" name="jugadores" value={c.jugadorId} />
                <input
                  type="checkbox"
                  name={`presente_${c.jugadorId}`}
                  defaultChecked={c.presente ?? false}
                  className="accent-[color:var(--brand)]"
                />
                {c.nombre} {c.apellido}
              </label>
            ))}
            <Button type="submit" size="sm">
              Guardar asistencia
            </Button>
          </form>
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
          <form action={cargarResultadoAction} className="flex items-end gap-3">
            <input type="hidden" name="eventoId" value={ev.id} />
            <div>
              <label className="mb-1 block text-xs text-muted">Local</label>
              <input
                name="resultadoLocal"
                type="number"
                min={0}
                defaultValue={ev.resultadoLocal ?? 0}
                className="w-20 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm tabular outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Visitante</label>
              <input
                name="resultadoVisitante"
                type="number"
                min={0}
                defaultValue={ev.resultadoVisitante ?? 0}
                className="w-20 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm tabular outline-none focus:border-brand"
              />
            </div>
            <Button type="submit">Cargar resultado</Button>
          </form>
          <p className="mt-2 text-xs text-muted">
            Al cargar el resultado se genera una noticia del club y se notifica a
            las familias.
          </p>
        </Card>
      )}

      {ev.tipo === "PARTIDO" && ev.convocados.length > 0 && (
        <Card className="overflow-x-auto">
          <h2 className="mb-1 text-lg font-bold">Estadística individual</h2>
          <p className="mb-3 text-xs text-muted">
            Carga la línea de cada jugador en el partido. Se guarda todo junto.
          </p>
          <form action={cargarEstadisticasAction} className="space-y-2">
            <input type="hidden" name="eventoId" value={ev.id} />
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-1 pr-2">Jugador</th>
                  <th className="px-1 text-center">Titular</th>
                  <th className="px-1 text-center">Min</th>
                  <th className="px-1 text-center">Goles</th>
                  <th className="px-1 text-center">Asist.</th>
                  <th className="px-1 text-center">Amar.</th>
                  <th className="px-1 text-center">Roja</th>
                </tr>
              </thead>
              <tbody>
                {ev.convocados.map((c) => {
                  const s = c.estadistica;
                  return (
                    <tr key={c.jugadorId} className="border-t border-subtle/50">
                      <td className="py-2 pr-2">
                        <input type="hidden" name="jugadores" value={c.jugadorId} />
                        {c.nombre} {c.apellido}
                      </td>
                      <td className="px-1 text-center">
                        <input type="checkbox" name={`titular_${c.jugadorId}`} defaultChecked={s?.titular ?? false} className="accent-[color:var(--brand)]" />
                      </td>
                      <td className="px-1">
                        <input name={`minutos_${c.jugadorId}`} type="number" min={0} max={200} defaultValue={s?.minutos ?? 0} aria-label={`Minutos ${c.nombre}`} className={numInput} />
                      </td>
                      <td className="px-1">
                        <input name={`goles_${c.jugadorId}`} type="number" min={0} max={99} defaultValue={s?.goles ?? 0} aria-label={`Goles ${c.nombre}`} className={numInput} />
                      </td>
                      <td className="px-1">
                        <input name={`asistencias_${c.jugadorId}`} type="number" min={0} max={99} defaultValue={s?.asistencias ?? 0} aria-label={`Asistencias ${c.nombre}`} className={numInput} />
                      </td>
                      <td className="px-1">
                        <input name={`amarillas_${c.jugadorId}`} type="number" min={0} max={2} defaultValue={s?.amarillas ?? 0} aria-label={`Amarillas ${c.nombre}`} className={numInput} />
                      </td>
                      <td className="px-1 text-center">
                        <input type="checkbox" name={`roja_${c.jugadorId}`} defaultChecked={s?.roja ?? false} className="accent-[color:var(--brand)]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Button type="submit" size="sm">
              Guardar estadística
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
