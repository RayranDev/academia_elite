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
    },
    select: { id: true },
  });
}

export function listarLeadsGlobal() {
  return db.lead.findMany({ orderBy: { createdAt: "desc" } });
}

export function obtenerLeadGlobal(id: string) {
  return db.lead.findUnique({ where: { id } });
}

export function actualizarEstadoLeadGlobal(id: string, estado: string) {
  return db.lead.update({ where: { id }, data: { estado } });
}
