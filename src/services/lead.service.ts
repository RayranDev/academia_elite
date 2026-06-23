import type { AuthContext } from "@/lib/auth/context";
import { requirePermiso } from "@/lib/auth/guards";
import {
  crearLeadGlobal,
  listarLeadsGlobal,
  obtenerLeadGlobal,
  obtenerLeadConNotas,
  actualizarLeadGlobal,
  crearLeadNota,
} from "@/repositories/lead.repository";
import { nombresDeUsuarios } from "@/repositories/user.repository";
import type { LeadInput } from "@/lib/validators/lead";
import type { EditarLeadInput } from "@/lib/validators/admin";
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
  origen: string | null;
  responsableId: string | null;
  responsableNombre: string | null;
  proximaAccion: string | null;
  fechaProximoContacto: string | null;
  observaciones: string | null;
  createdAt: string;
}

export interface LeadNotaDTO {
  id: string;
  comentario: string;
  autorNombre: string;
  createdAt: string;
}

export interface LeadDetalleDTO extends LeadDTO {
  notas: LeadNotaDTO[];
}

interface LeadRow {
  id: string;
  nombreEscuela: string;
  contactoNombre: string;
  contactoEmail: string;
  telefono: string | null;
  ciudad: string | null;
  mensaje: string | null;
  estado: string;
  origen: string | null;
  responsableId: string | null;
  proximaAccion: string | null;
  fechaProximoContacto: Date | null;
  observaciones: string | null;
  createdAt: Date;
}

function mapLead(r: LeadRow, nombres: Map<string, string>): LeadDTO {
  return {
    id: r.id,
    nombreEscuela: r.nombreEscuela,
    contactoNombre: r.contactoNombre,
    contactoEmail: r.contactoEmail,
    telefono: r.telefono,
    ciudad: r.ciudad,
    mensaje: r.mensaje,
    estado: r.estado as EstadoLead,
    origen: r.origen,
    responsableId: r.responsableId,
    responsableNombre: r.responsableId
      ? (nombres.get(r.responsableId) ?? null)
      : null,
    proximaAccion: r.proximaAccion,
    fechaProximoContacto: r.fechaProximoContacto?.toISOString() ?? null,
    observaciones: r.observaciones,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Crear lead desde la landing (público, sin ctx). */
export async function crearLead(input: LeadInput): Promise<{ id: string }> {
  return crearLeadGlobal(input);
}

/** Listar leads, opcionalmente por estado (solo con permiso de leads). */
export async function listarLeads(
  ctx: AuthContext,
  estado?: EstadoLead,
): Promise<LeadDTO[]> {
  requirePermiso(ctx, "GESTIONAR_LEADS");
  const rows = await listarLeadsGlobal(estado);
  const ids = [
    ...new Set(rows.map((r) => r.responsableId).filter((v): v is string => !!v)),
  ];
  const nombres = new Map(
    (await nombresDeUsuarios(ids)).map((u) => [u.id, u.nombre]),
  );
  return rows.map((r) => mapLead(r, nombres));
}

/** Detalle del lead con su historial de notas (solo con permiso de leads). */
export async function obtenerLeadDetalle(
  ctx: AuthContext,
  leadId: string,
): Promise<LeadDetalleDTO> {
  requirePermiso(ctx, "GESTIONAR_LEADS");
  const lead = await obtenerLeadConNotas(leadId);
  if (!lead) throw new NotFoundError("Lead no encontrado.");
  const ids = [
    ...new Set(
      [lead.responsableId, ...lead.notas.map((n) => n.usuarioId)].filter(
        (v): v is string => !!v,
      ),
    ),
  ];
  const nombres = new Map(
    (await nombresDeUsuarios(ids)).map((u) => [u.id, u.nombre]),
  );
  return {
    ...mapLead(lead, nombres),
    notas: lead.notas.map((n) => ({
      id: n.id,
      comentario: n.comentario,
      autorNombre: nombres.get(n.usuarioId) ?? "—",
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

/** Actualiza estado y campos de seguimiento del lead (auditado). */
export async function actualizarLead(
  ctx: AuthContext,
  leadId: string,
  input: EditarLeadInput,
): Promise<void> {
  requirePermiso(ctx, "GESTIONAR_LEADS");
  const lead = await obtenerLeadGlobal(leadId);
  if (!lead) throw new NotFoundError("Lead no encontrado.");

  const responsableId =
    input.responsable === "asignarme"
      ? ctx.userId
      : input.responsable === "quitar"
        ? null
        : undefined; // "mantener": sin cambios

  await actualizarLeadGlobal(leadId, {
    estado: input.estado,
    responsableId,
    proximaAccion: input.proximaAccion,
    fechaProximoContacto: input.fechaProximoContacto,
    observaciones: input.observaciones,
  });
  await registrarAuditoria(ctx, {
    accion: "ACTUALIZAR_LEAD",
    entidad: "Lead",
    entidadId: leadId,
    motivo:
      lead.estado !== input.estado
        ? `${lead.estado} → ${input.estado}`
        : "Actualización de seguimiento",
  });
}

/** Agrega una nota de seguimiento al lead. */
export async function agregarNotaLead(
  ctx: AuthContext,
  leadId: string,
  comentario: string,
): Promise<void> {
  requirePermiso(ctx, "GESTIONAR_LEADS");
  const lead = await obtenerLeadGlobal(leadId);
  if (!lead) throw new NotFoundError("Lead no encontrado.");
  await crearLeadNota({ leadId, usuarioId: ctx.userId, comentario });
}
