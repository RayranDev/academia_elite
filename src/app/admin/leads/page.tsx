import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarLeads } from "@/services/lead.service";
import { Card } from "@/components/ui/Card";
import {
  EstadoLeadBadge,
  LABEL_ESTADO_LEAD,
} from "@/components/admin/EstadoLeadBadge";
import { ESTADOS_LEAD, type EstadoLead } from "@/types";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { estado } = await searchParams;
  const filtro = ESTADOS_LEAD.includes(estado as EstadoLead)
    ? (estado as EstadoLead)
    : undefined;
  const leads = await listarLeads(ctx, filtro);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Leads</h1>

      <div className="flex flex-wrap gap-2 text-xs">
        <FiltroLink href="/admin/leads" activo={!filtro}>
          Todos
        </FiltroLink>
        {ESTADOS_LEAD.map((e) => (
          <FiltroLink
            key={e}
            href={`/admin/leads?estado=${e}`}
            activo={filtro === e}
          >
            {LABEL_ESTADO_LEAD[e]}
          </FiltroLink>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        {leads.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No hay leads{filtro ? " en este estado" : " todavía"}.
          </p>
        ) : (
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
              {leads.map((l) => (
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
