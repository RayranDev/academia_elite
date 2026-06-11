import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerDetalleJugadorDt } from "@/services/jugador.service";
import { DomainError } from "@/lib/errors";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function JugadorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let detalle;
  try {
    detalle = await obtenerDetalleJugadorDt(ctx, id);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return (
    <div className="space-y-6">
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
                      {new Date(h.fecha).toLocaleDateString("es")}
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
    </div>
  );
}
