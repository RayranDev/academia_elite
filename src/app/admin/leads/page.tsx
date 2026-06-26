import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarLeads } from "@/services/lead.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Paginacion } from "@/components/ui/Paginacion";
import {
  EstadoLeadBadge,
  LABEL_ESTADO_LEAD,
} from "@/components/admin/EstadoLeadBadge";
import { ESTADOS_LEAD, type EstadoLead } from "@/types";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string; q?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { estado, page: pageStr, q } = await searchParams;
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1;
  const filtro = ESTADOS_LEAD.includes(estado as EstadoLead)
    ? (estado as EstadoLead)
    : undefined;

  const res = await listarLeads(ctx, { page, limit: 10, search: q, estado: filtro });

  // Construcción de URLs preservando la query de búsqueda
  const qParam = q ? `q=${encodeURIComponent(q)}` : "";
  const urlTodos = qParam ? `/admin/leads?${qParam}` : "/admin/leads";

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Leads</h1>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-2 p-3 rounded-xl border border-subtle">
        <form method="GET" action="/admin/leads" className="flex items-center gap-2 max-w-sm w-full">
          {filtro && <input type="hidden" name="estado" value={filtro} />}
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="Buscar por escuela, contacto..."
            className="w-full rounded-lg border border-subtle bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-pitch"
          />
          <Button type="submit" size="sm">Buscar</Button>
          {q && (
            <Link
              href={filtro ? `/admin/leads?estado=${filtro}` : "/admin/leads"}
              className="text-xs text-muted hover:text-foreground hover:underline ml-2"
            >
              Limpiar
            </Link>
          )}
        </form>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <FiltroLink href={urlTodos} activo={!filtro}>
          Todos
        </FiltroLink>
        {ESTADOS_LEAD.map((e) => {
          const urlEstado = `/admin/leads?estado=${e}${qParam ? `&${qParam}` : ""}`;
          return (
            <FiltroLink
              key={e}
              href={urlEstado}
              activo={filtro === e}
            >
              {LABEL_ESTADO_LEAD[e]}
            </FiltroLink>
          );
        })}
      </div>

      <Card className="overflow-x-auto p-0">
        {res.items.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            {q 
              ? "No se encontraron leads con ese criterio de búsqueda."
              : `No hay leads${filtro ? " en este estado" : " todavía"}.`}
          </p>
        ) : (
          <div className="p-4 space-y-4">
            <table className="w-full text-sm">
              <thead className="border-b border-subtle text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Escuela</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Próxima acción</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Creado</th>
                </tr>
              </thead>
              <tbody>
                {res.items.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-subtle/50 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/leads/${l.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {l.nombreEscuela}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>{l.contactoNombre}</div>
                      <div className="text-xs text-muted">{l.contactoEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <EstadoLeadBadge estado={l.estado} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {l.proximaAccion ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {l.responsableNombre ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(l.createdAt).toLocaleDateString("es")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Paginacion page={res.page} totalPages={res.totalPages} totalItems={res.total} />
          </div>
        )}
      </Card>
    </div>
  );
}

function FiltroLink({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 transition ${
        activo
          ? "bg-brand font-semibold text-base"
          : "bg-surface-2 text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
