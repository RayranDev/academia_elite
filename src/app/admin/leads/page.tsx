import { requireAuthContext } from "@/lib/auth/session";
import { listarLeads, type LeadDTO } from "@/services/lead.service";
import { actualizarEstadoLeadAction } from "@/actions/admin.actions";
import { ConvertLeadDialog } from "@/components/admin/ConvertLeadDialog";
import { Badge } from "@/components/ui/Badge";
import { ESTADOS_LEAD, type EstadoLead } from "@/types";

const TITULO: Record<EstadoLead, string> = {
  NUEVO: "Nuevos",
  CONTACTADO: "Contactados",
  CONVERTIDO: "Convertidos",
  DESCARTADO: "Descartados",
};

export default async function LeadsPage() {
  const ctx = await requireAuthContext();
  const leads = await listarLeads(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Pipeline de leads</h1>
      <div className="grid gap-4 lg:grid-cols-4">
        {ESTADOS_LEAD.map((estado) => {
          const items = leads.filter((l) => l.estado === estado);
          return (
            <div key={estado} className="rounded-xl border border-subtle bg-surface/50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  {TITULO[estado]}
                </h2>
                <Badge tono={estado === "CONVERTIDO" ? "pitch" : "neutral"}>
                  {items.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-xs text-muted">Vacío</p>
                ) : (
                  items.map((lead) => <LeadCard key={lead.id} lead={lead} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadDTO }) {
  const otrosEstados = ESTADOS_LEAD.filter((e) => e !== lead.estado);
  return (
    <div className="rounded-lg border border-subtle bg-surface-2 p-3 text-sm">
      <p className="font-bold">{lead.nombreEscuela}</p>
      <p className="text-muted">{lead.contactoNombre}</p>
      <p className="break-all text-xs text-muted">{lead.contactoEmail}</p>
      {lead.ciudad && <p className="text-xs text-muted">{lead.ciudad}</p>}
      {lead.mensaje && (
        <p className="mt-2 line-clamp-3 text-xs text-foreground/80">
          “{lead.mensaje}”
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {otrosEstados.map((estado) => (
          <form key={estado} action={actualizarEstadoLeadAction}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="estado" value={estado} />
            <button
              type="submit"
              className="rounded border border-subtle px-2 py-0.5 text-[11px] text-muted hover:border-pitch hover:text-foreground"
            >
              → {estado}
            </button>
          </form>
        ))}
      </div>

      {lead.estado !== "CONVERTIDO" && (
        <div className="mt-2">
          <ConvertLeadDialog
            leadId={lead.id}
            nombreEscuela={lead.nombreEscuela}
            contactoNombre={lead.contactoNombre}
            contactoEmail={lead.contactoEmail}
          />
        </div>
      )}
    </div>
  );
}
