import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerDetalleJugadorDt } from "@/services/jugador.service";
import { DomainError } from "@/lib/errors";
import { EvaluationForm } from "@/components/dt/EvaluationForm";

export default async function EvaluarPage({
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
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href={`/dt/jugadores/${id}`} className="text-sm text-muted hover:text-foreground">
          ← Volver a la ficha
        </Link>
        <h1 className="mt-1 text-3xl font-black italic uppercase">
          Evaluar a {detalle.nombre} {detalle.apellido}
        </h1>
        <p className="text-sm text-muted">
          {detalle.categoriaNombre} · {detalle.posicion}. Carga 4 pruebas físicas,
          4 técnicas (1–10) y 4 de mentalidad (1–10).
        </p>
      </div>

      <EvaluationForm
        jugador={{
          id: detalle.id,
          nombre: detalle.nombre,
          apellido: detalle.apellido,
          posicion: detalle.posicion,
          dorsal: detalle.dorsal ?? undefined,
        }}
      />
    </div>
  );
}
