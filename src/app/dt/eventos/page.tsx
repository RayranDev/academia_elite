import { requireAuthContext } from "@/lib/auth/session";
import { listarEventosDt } from "@/services/evento.service";
import { EventosListado } from "@/components/eventos/EventosListado";
import type { EstadoEvento, TipoEvento } from "@/types";

interface PageProps {
  searchParams: Promise<{
    tipo?: string;
    estado?: string;
    desde?: string;
    hasta?: string;
    page?: string;
  }>;
}

export default async function EventosDtPage({ searchParams }: PageProps) {
  const ctx = await requireAuthContext();
  const params = await searchParams;

  const res = await listarEventosDt(ctx, {
    tipo: (params.tipo as TipoEvento) || undefined,
    estado: (params.estado as EstadoEvento) || undefined,
    desde: params.desde ? new Date(params.desde) : undefined,
    hasta: params.hasta ? new Date(`${params.hasta}T23:59:59`) : undefined,
    page: Math.max(1, parseInt(params.page || "1", 10)),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Eventos</h1>
      <p className="text-sm text-muted">
        Todos los entrenamientos, partidos, evaluaciones y otros eventos de tus categorías.
      </p>
      <EventosListado
        eventos={res.items}
        page={res.page}
        totalPages={res.totalPages}
        totalItems={res.total}
        basePathDetalle="/dt/eventos/"
      />
    </div>
  );
}
