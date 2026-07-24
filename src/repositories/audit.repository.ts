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

export interface FiltrosAudit {
  escuelaId?: string;
  accion?: string;
  entidad?: string;
  actorRol?: string;
  /** Rango por fecha de creación (inclusive en ambos extremos). */
  desde?: Date;
  hasta?: Date;
  skip?: number;
  take?: number;
}

function whereAudit(opts: FiltrosAudit) {
  const rango =
    opts.desde || opts.hasta
      ? {
          createdAt: {
            ...(opts.desde ? { gte: opts.desde } : {}),
            ...(opts.hasta ? { lte: opts.hasta } : {}),
          },
        }
      : {};
  return {
    ...(opts.escuelaId ? { escuelaId: opts.escuelaId } : {}),
    ...(opts.accion ? { accion: opts.accion } : {}),
    ...(opts.entidad ? { entidad: opts.entidad } : {}),
    ...(opts.actorRol ? { actorRol: opts.actorRol } : {}),
    ...rango,
  };
}

/** Página del AuditLog + total, para paginar. Devuelve {rows, total}. */
export async function listarAuditGlobal(opts: FiltrosAudit) {
  const where = whereAudit(opts);
  const [rows, total] = await Promise.all([
    // tenant-global: log append-only de plataforma; solo lo consulta el
    // SUPER_ADMIN vía VER_AUDITORIA. El filtro por escuela es opcional (una
    // vista de plataforma abarca todos los tenants a propósito).
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: opts.skip ?? 0,
      take: opts.take ?? 50,
    }),
    // tenant-global: total del log de plataforma; mismo where que la página.
    db.auditLog.count({ where }),
  ]);
  return { rows, total };
}

/** Valores distintos presentes en el log, para poblar los filtros de la vista. */
export async function facetasAuditGlobal() {
  const [acciones, entidades, roles] = await Promise.all([
    // tenant-global: catálogo de valores distintos del log de plataforma para
    // los filtros; solo accesible al SUPER_ADMIN vía VER_AUDITORIA.
    db.auditLog.findMany({
      distinct: ["accion"],
      select: { accion: true },
      orderBy: { accion: "asc" },
    }),
    // tenant-global: valores distintos de entidad del log de plataforma.
    db.auditLog.findMany({
      distinct: ["entidad"],
      select: { entidad: true },
      orderBy: { entidad: "asc" },
    }),
    // tenant-global: valores distintos de rol de actor del log de plataforma.
    db.auditLog.findMany({
      distinct: ["actorRol"],
      select: { actorRol: true },
      orderBy: { actorRol: "asc" },
    }),
  ]);
  return {
    acciones: acciones.map((a) => a.accion),
    entidades: entidades.map((e) => e.entidad),
    roles: roles.map((r) => r.actorRol),
  };
}
