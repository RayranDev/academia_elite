import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import {
  crearLeadGlobal,
  listarLeadsGlobal,
  obtenerLeadGlobal,
  actualizarEstadoLeadGlobal,
} from "@/repositories/lead.repository";
import type { LeadInput } from "@/lib/validators/lead";
import type { EstadoLead } from "@/types";
import { NotFoundError } from "@/lib/errors";
import { registrarAuditoria } from "@/services/audit.service";

export interface LeadDTO {
  id: string;
  nombreEscuela: string;
  contactoNombre: string;
  contactoEmail: string;
  telefono: string | null;
  ciudad: string | null;
  mensaje: string | null;
  estado: EstadoLead;
  createdAt: string;
}

/** Crear lead desde la landing (público, sin ctx). */
export async function crearLead(input: LeadInput): Promise<{ id: string }> {
  return crearLeadGlobal(input);
}

/** Listar leads (solo SUPER_ADMIN). */
export async function listarLeads(ctx: AuthContext): Promise<LeadDTO[]> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const rows = await listarLeadsGlobal();
  return rows.map(mapLead);
}

/** Cambiar estado del lead en el pipeline (solo SUPER_ADMIN). */
export async function actualizarEstadoLead(
  ctx: AuthContext,
  leadId: string,
  estado: EstadoLead,
): Promise<void> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const lead = await obtenerLeadGlobal(leadId);
  if (!lead) throw new NotFoundError();
  await actualizarEstadoLeadGlobal(leadId, estado);
  await registrarAuditoria(ctx, {
    accion: "CAMBIO_ESTADO_LEAD",
    entidad: "Lead",
    entidadId: leadId,
    motivo: `${lead.estado} → ${estado}`,
  });
}

function mapLead(r: {
  id: string;
  nombreEscuela: string;
  contactoNombre: string;
  contactoEmail: string;
  telefono: string | null;
  ciudad: string | null;
  mensaje: string | null;
  estado: string;
  createdAt: Date;
}): LeadDTO {
  return {
    id: r.id,
    nombreEscuela: r.nombreEscuela,
    contactoNombre: r.contactoNombre,
    contactoEmail: r.contactoEmail,
    telefono: r.telefono,
    ciudad: r.ciudad,
    mensaje: r.mensaje,
    estado: r.estado as EstadoLead,
    createdAt: r.createdAt.toISOString(),
  };
}
