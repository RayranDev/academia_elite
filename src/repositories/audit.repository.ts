import { db } from "@/lib/db";

export interface CrearAuditInput {
  actorId: string;
  actorRol: string;
  accion: string;
  entidad: string;
  entidadId: string;
  escuelaId?: string | null;
  motivo?: string | null;
}

// Repositorio de auditoría (Capa 4). Append-only: solo crear y leer.
export function crearAuditGlobal(data: CrearAuditInput) {
  return db.auditLog.create({
    data: {
      actorId: data.actorId,
      actorRol: data.actorRol,
      accion: data.accion,
      entidad: data.entidad,
      entidadId: data.entidadId,
      escuelaId: data.escuelaId ?? null,
      motivo: data.motivo ?? null,
    },
  });
}

export function listarAuditGlobal(opts: {
  escuelaId?: string;
  take?: number;
}) {
  return db.auditLog.findMany({
    where: opts.escuelaId ? { escuelaId: opts.escuelaId } : undefined,
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 200,
  });
}
