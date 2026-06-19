import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { obtenerEscuelaAdmin } from "@/services/escuela.service";
import { listarJugadoresGestion } from "@/services/gestion-jugadores.service";
import { listarCategoriasAdmin } from "@/services/categoria.service";
import { EscuelaEditarForm } from "@/components/gestion/EscuelaEditarForm";
import { JugadoresGestion } from "@/components/gestion/JugadoresGestion";
import { ImportarJugadoresDialog } from "@/components/gestion/ImportarJugadoresDialog";
import { ImportarEvaluacionesDialog } from "@/components/dt/ImportarEvaluacionesDialog";
import { EntrarSoporteDialog } from "@/components/admin/EntrarSoporteDialog";

export default async function EscuelaDetalleAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let datos;
  try {
    const [escuela, jugadores, categorias] = await Promise.all([
      obtenerEscuelaAdmin(ctx, id),
      listarJugadoresGestion(ctx, { escuelaId: id }),
      listarCategoriasAdmin(ctx, id),
    ]);
    datos = { escuela, jugadores, categorias };
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-display italic uppercase">{datos.escuela.nombre}</h1>
        <EntrarSoporteDialog escuelaId={id} escuelaNombre={datos.escuela.nombre} />
      </div>
      <EscuelaEditarForm escuela={datos.escuela} />
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <h2 className="text-xl font-bold">Jugadores</h2>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/jugadores-export?escuelaId=${id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            Descargar jugadores
          </a>
          <ImportarEvaluacionesDialog escuelaId={id} />
          <ImportarJugadoresDialog escuelaId={id} />
        </div>
      </div>
      <JugadoresGestion
        jugadores={datos.jugadores}
        categorias={datos.categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        esSuperAdmin
      />
    </div>
  );
}
