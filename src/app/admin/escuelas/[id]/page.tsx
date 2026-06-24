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
import { Card } from "@/components/ui/Card";

export default async function EscuelaDetalleAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; q?: string; categoriaId?: string; estado?: string }>;
}) {
  const { id } = await params;
  const { page: pageStr, q, categoriaId, estado } = await searchParams;
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1;
  const ctx = await requireAuthContext();
  // El detalle de un tenant (roster de menores) solo se ve con una sesión de
  // soporte activa para esta escuela. La ficha institucional sí es accesible
  // (es gobierno de plataforma) para poder iniciar el soporte desde acá.
  const enSoporte = ctx.soporte?.escuelaId === id;

  let datos;
  try {
    const [escuela, categorias] = await Promise.all([
      obtenerEscuelaAdmin(ctx, id),
      listarCategoriasAdmin(ctx, id),
    ]);
    const jugadores = enSoporte
      ? await listarJugadoresGestion(ctx, {
          escuelaId: id,
          page,
          limit: 20,
          search: q,
          categoriaId,
          estado,
        })
      : { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    datos = { escuela, jugadores, categorias };
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-display italic uppercase">
            {datos.escuela.nombre}
          </h1>
          {datos.escuela.codigoRef && (
            <p className="text-xs text-muted">
              Código:{" "}
              <span className="select-all font-mono text-foreground/80">
                {datos.escuela.codigoRef}
              </span>
            </p>
          )}
        </div>
        <EntrarSoporteDialog escuelaId={id} escuelaNombre={datos.escuela.nombre} />
      </div>
      <EscuelaEditarForm escuela={datos.escuela} />
      {enSoporte ? (
        <>
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
            res={datos.jugadores}
            categorias={datos.categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
            esSuperAdmin
          />
        </>
      ) : (
        <Card>
          <h2 className="text-xl font-bold">Jugadores</h2>
          <p className="mt-2 text-sm text-muted">
            Para ver y gestionar los jugadores de esta escuela, abrí una{" "}
            <b>sesión de soporte</b> con el botón de arriba. El acceso a los datos
            del tenant queda auditado.
          </p>
        </Card>
      )}
    </div>
  );
}
