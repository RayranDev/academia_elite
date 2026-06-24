import { db } from "@/lib/db";
import { generarCodigoRef } from "@/lib/codes";

// Repositorio de escuelas (Capa 4).
export function listarEscuelasGlobal(opts?: {
  skip?: number;
  take?: number;
  search?: string;
}) {
  const where = opts?.search
    ? {
        OR: [
          { nombre: { contains: opts.search } },
          { codigoRef: { contains: opts.search } },
        ],
      }
    : undefined;

  return db.escuela.findMany({
    where,
    skip: opts?.skip,
    take: opts?.take,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jugadores: true, categorias: true, users: true } },
    },
  });
}

export function contarEscuelasGlobal(search?: string) {
  const where = search
    ? {
        OR: [
          { nombre: { contains: search } },
          { codigoRef: { contains: search } },
        ],
      }
    : undefined;

  return db.escuela.count({ where });
}

export function slugExisteGlobal(slug: string) {
  return db.escuela.findUnique({ where: { slug }, select: { id: true } });
}

// tenant-global: unicidad global de email antes de crear un admin (clave única).
export function emailExisteGlobal(email: string) {
  return db.user.findUnique({ where: { email }, select: { id: true } });
}

/**
 * Crea una escuela con su ESCUELA_ADMIN inicial de forma atómica (escuela + user +
 * AuditLog). Si viene `leadId`, marca ese lead como CONVERTIDO en la misma
 * transacción. La atomicidad multi-tabla vive en la Capa 4 (no en el servicio).
 */
export function crearEscuelaConAdmin(input: {
  nombreEscuela: string;
  slug: string;
  adminEmail: string;
  adminNombre: string;
  passwordHash: string;
  actorId: string;
  actorRol: string;
  accion: string;
  motivo: string;
  leadId?: string;
}): Promise<string> {
  return db.$transaction(async (tx) => {
    const escuela = await tx.escuela.create({
      data: {
        nombre: input.nombreEscuela,
        slug: input.slug,
        codigoRef: generarCodigoRef("ESC"),
      },
    });
    await tx.user.create({
      data: {
        email: input.adminEmail,
        passwordHash: input.passwordHash,
        nombre: input.adminNombre,
        rol: "ESCUELA_ADMIN",
        escuelaId: escuela.id,
      },
    });
    if (input.leadId) {
      await tx.lead.update({
        where: { id: input.leadId },
        data: { estado: "CONVERTIDO" },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        actorRol: input.actorRol,
        accion: input.accion,
        entidad: "Escuela",
        entidadId: escuela.id,
        escuelaId: escuela.id,
        motivo: input.motivo,
      },
    });
    return escuela.id;
  });
}

export function obtenerEscuela(escuelaId: string) {
  return db.escuela.findUnique({ where: { id: escuelaId } });
}

/** Edición administrativa de una escuela (Súper Admin). */
export function actualizarEscuelaAdmin(
  escuelaId: string,
  data: { nombre: string; slug: string; colorPrimario: string; activa: boolean },
) {
  return db.escuela.update({
    where: { id: escuelaId },
    data,
    select: { id: true },
  });
}

export function actualizarBrandingEscuela(
  escuelaId: string,
  data: {
    nombre?: string;
    colorPrimario?: string;
    logoUrl?: string | null;
    frecuenciaEvaluacionDias?: number;
  },
) {
  return db.escuela.update({ where: { id: escuelaId }, data });
}

export function obtenerEscuelasDropdown() {
  return db.escuela.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}
