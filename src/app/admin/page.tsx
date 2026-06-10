import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { listarLeads } from "@/services/lead.service";
import { listarEscuelas } from "@/services/escuela.service";
import { listarAuditoria } from "@/services/audit.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ESTADOS_LEAD } from "@/types";

export default async function AdminOverviewPage() {
  const ctx = await requireAuthContext();
  const [leads, escuelas, auditoria] = await Promise.all([
    listarLeads(ctx),
    listarEscuelas(ctx),
    listarAuditoria(ctx, {}),
  ]);

  const porEstado = Object.fromEntries(
    ESTADOS_LEAD.map((e) => [e, leads.filter((l) => l.estado === e).length]),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black italic uppercase">Resumen</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile titulo="Leads nuevos" valor={porEstado.NUEVO} href="/admin/leads" />
        <Tile titulo="Convertidos" valor={porEstado.CONVERTIDO} href="/admin/leads" />
        <Tile titulo="Escuelas" valor={escuelas.length} href="/admin/escuelas" />
        <Tile
          titulo="Acciones auditadas"
          valor={auditoria.length}
          href="/admin/auditoria"
        />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pipeline de leads</h2>
          <Link href="/admin/leads" className="text-sm text-pitch">
            Ver pipeline →
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {ESTADOS_LEAD.map((e) => (
            <div
              key={e}
              className="rounded-lg border border-subtle bg-surface-2 px-4 py-3"
            >
              <div className="text-2xl font-black tabular">{porEstado[e]}</div>
              <Badge tono={e === "CONVERTIDO" ? "pitch" : "neutral"}>{e}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Actividad reciente</h2>
        {auditoria.length === 0 ? (
          <p className="text-sm text-muted">Sin acciones registradas todavía.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {auditoria.slice(0, 6).map((a) => (
              <li key={a.id} className="flex justify-between border-b border-subtle pb-2">
                <span>
                  <span className="font-semibold text-pitch">{a.accion}</span>{" "}
                  <span className="text-muted">
                    {a.entidad} · {a.motivo}
                  </span>
                </span>
                <span className="text-muted">
                  {new Date(a.createdAt).toLocaleString("es")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Tile({
  titulo,
  valor,
  href,
}: {
  titulo: string;
  valor: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-pitch/50">
        <div className="text-3xl font-black tabular">{valor}</div>
        <div className="mt-1 text-sm text-muted">{titulo}</div>
      </Card>
    </Link>
  );
}
