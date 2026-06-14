import { requireAuthContext } from "@/lib/auth/session";
import { listarAuditoria } from "@/services/audit.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AuditoriaPage() {
  const ctx = await requireAuthContext();
  const registros = await listarAuditoria(ctx, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black italic uppercase">Auditoría</h1>
        <a
          href="/api/auditoria-export"
          className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
        >
          Descargar Excel
        </a>
      </div>
      <p className="text-sm text-muted">
        Registro append-only de acciones sensibles (últimos {registros.length}).
      </p>

      <Card className="overflow-x-auto p-0">
        {registros.length === 0 ? (
          <p className="p-6 text-muted">Sin registros todavía.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-subtle/50">
                  <td className="whitespace-nowrap px-4 py-2 text-muted">
                    {new Date(r.createdAt).toLocaleString("es")}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tono="info">{r.accion}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {r.entidad}
                    <span className="block font-mono text-[10px]">
                      {r.entidadId}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted">{r.actorRol}</td>
                  <td className="px-4 py-2 text-foreground/80">{r.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
