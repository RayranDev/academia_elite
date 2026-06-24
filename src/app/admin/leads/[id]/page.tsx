import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { obtenerLeadDetalle } from "@/services/lead.service";
import { Card } from "@/components/ui/Card";
import { EstadoLeadBadge } from "@/components/admin/EstadoLeadBadge";
import { LeadEditarForm } from "@/components/admin/LeadEditarForm";
import { AgregarNotaForm } from "@/components/admin/AgregarNotaForm";
import { ConvertLeadDialog } from "@/components/admin/ConvertLeadDialog";

export default async function LeadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let lead;
  try {
    lead = await obtenerLeadDetalle(ctx, id);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/leads" className="text-sm text-muted hover:text-foreground">
        ← Leads
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black italic uppercase">
            {lead.nombreEscuela}
          </h1>
          <EstadoLeadBadge estado={lead.estado} />
        </div>
        {lead.estado !== "CONVERTIDO" && (
          <ConvertLeadDialog
            leadId={lead.id}
            nombreEscuela={lead.nombreEscuela}
            contactoNombre={lead.contactoNombre}
            contactoEmail={lead.contactoEmail}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase">Contacto</h2>
          <Dato label="Nombre" valor={lead.contactoNombre} />
          <Dato label="Email" valor={lead.contactoEmail} />
          <Dato label="Teléfono" valor={lead.telefono ?? "—"} />
          <Dato label="Ciudad" valor={lead.ciudad ?? "—"} />
          <Dato label="Origen" valor={lead.origen ?? "—"} />
          {lead.mensaje && (
            <p className="mt-3 text-sm text-foreground/80">“{lead.mensaje}”</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase">Seguimiento</h2>
          <LeadEditarForm lead={lead} />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase">Notas</h2>
          <AgregarNotaForm leadId={lead.id} />
          <ul className="mt-4 space-y-3">
            {lead.notas.length === 0 ? (
              <li className="text-sm text-muted">Sin notas todavía.</li>
            ) : (
              lead.notas.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-subtle/50 pb-2 text-sm last:border-0"
                >
                  <p className="whitespace-pre-wrap text-foreground/90">
                    {n.comentario}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {n.autorNombre} · {new Date(n.createdAt).toLocaleString("es")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="mb-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="break-all text-sm">{valor}</p>
    </div>
  );
}
