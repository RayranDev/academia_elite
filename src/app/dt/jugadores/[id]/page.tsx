import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerDetalleJugadorDt } from "@/services/jugador.service";
import { credencialesFamiliaDt } from "@/services/gestion-jugadores.service";
import { listarObservacionesJugadorDt } from "@/services/sesion.service";
import { ResetPasswordButton } from "@/components/gestion/ResetPasswordButton";
import { resetPasswordFamiliaDtAction } from "@/actions/gestion.actions";
import { DomainError } from "@/lib/errors";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { ETIQUETA_TIPO } from "@/components/calendar/tipos";
import { crearObjetivoAction } from "@/actions/dt.actions";
import { STATS_OBJETIVO } from "@/types";

export default async function JugadorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let detalle;
  let credenciales: { email: string | null; bloqueado: boolean };
  let observaciones;
  try {
    [detalle, credenciales, observaciones] = await Promise.all([
      obtenerDetalleJugadorDt(ctx, id),
      credencialesFamiliaDt(ctx, id),
      listarObservacionesJugadorDt(ctx, id),
    ]);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return (
    <div className="space-y-6">
      <Link href="/dt/plantilla" className="text-sm text-muted hover:text-foreground">
        ← Volver a la plantilla
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black italic uppercase">
            {detalle.nombre} {detalle.apellido}
          </h1>
          <p className="text-sm text-muted">
            {detalle.categoriaNombre} · {detalle.posicion} ·{" "}
            <Badge tono={detalle.estado === "ACTIVO" ? "pitch" : "neutral"}>
              {detalle.estado}
            </Badge>
            {/* Solo si hay deuda, nunca la cifra: la cobranza sigue siendo de la
                escuela, esto es apenas contexto para el DT. */}
            {detalle.enMora && (
              <>
                {" "}
                <Badge tono="alerta">Pagos pendientes</Badge>
              </>
            )}
          </p>
        </div>
        <Link href={`/dt/jugadores/${detalle.id}/evaluar`}>
          <Button size="lg">Evaluar ahora</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex justify-center perspective-[1000px]">
          {detalle.card ? (
            <PlayerCard data={detalle.card} size="hero" interactive />
          ) : (
            <div className="flex aspect-3/4 w-80 flex-col items-center justify-center rounded-[14px] border border-dashed border-subtle bg-surface-2 text-center text-muted">
              <p>Sin evaluación todavía.</p>
              <p className="mt-1 text-sm text-pitch">
                Pulsa “Evaluar ahora” para crear su primera carta.
              </p>
            </div>
          )}
        </div>

        <Card>
          <h2 className="mb-3 text-lg font-bold">Historial de evaluaciones</h2>
          {detalle.historial.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay evaluaciones.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detalle.historial
                .slice()
                .reverse()
                .map((h, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between border-b border-subtle pb-2"
                  >
                    <span className="text-muted">
                      <FechaLocal iso={h.fecha} />
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tono="info">{h.nivel}</Badge>
                      <span className="font-black tabular">OVR {h.ovr}</span>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="max-w-xl">
        <h2 className="mb-3 text-lg font-bold">Observaciones del jugador</h2>
        {observaciones.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no cargaste observaciones. Se escriben durante el Modo Sesión
            de un entrenamiento o partido.
          </p>
        ) : (
          <ul className="space-y-3">
            {observaciones.map((o, i) => (
              <li key={i} className="rounded-lg border border-subtle bg-surface-2 p-3">
                <p className="whitespace-pre-wrap text-sm">{o.texto}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {o.visiblePadre ? (
                    <Badge tono="pitch">Visible a la familia</Badge>
                  ) : (
                    <Badge tono="neutral">Privada</Badge>
                  )}
                  {o.eventoTitulo && (
                    <span>
                      {o.eventoTipo ? `${ETIQUETA_TIPO[o.eventoTipo]}: ` : ""}
                      {o.eventoTitulo}
                    </span>
                  )}
                  <span className="ml-auto">
                    <FechaLocal iso={o.fecha} formato="d MMM yyyy, HH:mm" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="max-w-xl">
        <h2 className="mb-1 text-lg font-bold">Cuenta de la familia</h2>
        {credenciales.email ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-sm">{credenciales.email}</p>
              {credenciales.bloqueado && (
                <Badge tono="alerta" className="mt-1">
                  Acceso bloqueado por la escuela
                </Badge>
              )}
            </div>
            <ResetPasswordButton
              action={resetPasswordFamiliaDtAction}
              campos={{ jugadorId: detalle.id }}
              destinatario={`la familia de ${detalle.nombre} ${detalle.apellido}`}
            />
          </div>
        ) : (
          <p className="text-sm text-muted">
            Este jugador aún no tiene cuenta de familia vinculada.
          </p>
        )}
      </Card>

      <Card className="max-w-xl">
        <h2 className="mb-3 text-lg font-bold">Fijar objetivo de desarrollo</h2>
        <form
          action={crearObjetivoAction}
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="jugadorId" value={detalle.id} />
          <div>
            <label className="mb-1 block text-xs text-muted">Stat</label>
            <select
              name="stat"
              className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {STATS_OBJETIVO.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Meta</label>
            <input
              name="valorMeta"
              type="number"
              min={1}
              max={99}
              defaultValue={75}
              className="w-20 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm tabular outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Fecha límite</label>
            <input
              name="fechaLimite"
              type="date"
              required
              className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <Button type="submit">Crear objetivo</Button>
        </form>
      </Card>
    </div>
  );
}
