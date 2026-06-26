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

export function listarLeadsGlobal(opts?: {
  skip?: number;
  take?: number;
  search?: string;
  estado?: string;
}) {
  const where: Record<string, unknown> = {};
  if (opts?.estado) {
    where.estado = opts.estado;
  }
  if (opts?.search) {
    where.OR = [
      { nombreEscuela: { contains: opts.search } },
      { contactoNombre: { contains: opts.search } },
      { contactoEmail: { contains: opts.search } },
      { telefono: { contains: opts.search } },
    ];
  }

  return db.lead.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    skip: opts?.skip,
    take: opts?.take,
    orderBy: { createdAt: "desc" },
  });
}

export function contarLeadsGlobal(search?: string, estado?: string) {
  const where: Record<string, unknown> = {};
  if (estado) {
    where.estado = estado;
  }
  if (search) {
    where.OR = [
      { nombreEscuela: { contains: search } },
      { contactoNombre: { contains: search } },
      { contactoEmail: { contains: search } },
      { telefono: { contains: search } },
    ];
  }

  return db.lead.count({
    where: Object.keys(where).length > 0 ? where : undefined,
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
