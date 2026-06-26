import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarEscuelasPaginado } from "@/services/escuela.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NuevaEscuelaDialog } from "@/components/admin/NuevaEscuelaDialog";
import { Paginacion } from "@/components/ui/Paginacion";

export default async function EscuelasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { page: pageStr, q } = await searchParams;
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1;
  const res = await listarEscuelasPaginado(ctx, { page, limit: 9, search: q });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Escuelas</h1>
        <NuevaEscuelaDialog />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-2 p-3 rounded-xl border border-subtle">
        <form method="GET" action="/admin/escuelas" className="flex items-center gap-2 max-w-sm w-full">
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="Buscar por nombre o código..."
            className="w-full rounded-lg border border-subtle bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-pitch"
          />
          <Button type="submit" size="sm">Buscar</Button>
          {q && (
            <Link
              href="/admin/escuelas"
              className="text-xs text-muted hover:text-foreground hover:underline ml-2"
            >
              Limpiar
            </Link>
          )}
        </form>
      </div>

      {res.items.length === 0 ? (
        <Card>
          <p className="text-muted">
            {q
              ? "No se encontraron escuelas con ese criterio de búsqueda."
              : "Aún no hay escuelas. Creá la primera con “+ Nueva escuela”, o convertí un lead desde el pipeline."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {res.items.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{e.nombre}</h2>
                  <span
                    className="h-4 w-4 rounded-full border border-subtle"
                    style={{ background: e.colorPrimario }}
                    title={e.colorPrimario}
                  />
                </div>
                <p className="text-xs text-muted">/{e.slug}</p>
                <div className="mt-3 flex gap-2 text-xs">
                  <Badge>{e.categorias} categorías</Badge>
                  <Badge>{e.jugadores} jugadores</Badge>
                  <Badge>{e.usuarios} usuarios</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {e.activa ? (
                    <Badge tono="pitch">Activa</Badge>
                  ) : (
                    <Badge tono="alerta">Inactiva</Badge>
                  )}
                  <Link
                    href={`/admin/escuelas/${e.id}`}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Gestionar →
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <Paginacion page={res.page} totalPages={res.totalPages} totalItems={res.total} />
        </div>
      )}
    </div>
  );
}
