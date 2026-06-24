import { db } from "@/lib/db";
import type { LeadInput } from "@/lib/validators/lead";

// Repositorio de leads (Capa 4). Los leads son públicos (sin tenant): provienen
// de la landing antes de que exista una escuela, por eso no llevan escuelaId.

export function crearLeadGlobal(data: LeadInput) {
  return db.lead.create({
    data: {
      nombreEscuela: data.nombreEscuela,
      contactoNombre: data.contactoNombre,
      contactoEmail: data.contactoEmail,
      telefono: data.telefono || null,
      ciudad: data.ciudad || null,
      mensaje: data.mensaje || null,
      estado: "NUEVO",
      origen: "LANDING",
    },
    select: { id: true },
  });
}

/** Lista leads, opcionalmente filtrados por estado del funnel. */
export function listarLeadsGlobal(estado?: string) {
  return db.lead.findMany({
    where: estado ? { estado } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export function obtenerLeadGlobal(id: string) {
  return db.lead.findUnique({ where: { id } });
}

/** Lead con su historial de notas (más reciente primero), para la vista detalle. */
export function obtenerLeadConNotas(id: string) {
  return db.lead.findUnique({
    where: { id },
    include: { notas: { orderBy: { createdAt: "desc" } } },
  });
}

/** Actualiza los campos de seguimiento del lead (parcial). */
export function actualizarLeadGlobal(
  id: string,
  data: {
    estado?: string;
    responsableId?: string | null;
    proximaAccion?: string | null;
    fechaProximoContacto?: Date | null;
    observaciones?: string | null;
  },
) {
  return db.lead.update({ where: { id }, data, select: { id: true } });
}

export function crearLeadNota(data: {
  leadId: string;
  usuarioId: string;
  comentario: string;
}) {
  return db.leadNota.create({ data, select: { id: true } });
}
