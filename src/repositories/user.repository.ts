import { db } from "@/lib/db";

// Repositorio de usuarios (Capa 4). Nunca expone passwordHash hacia arriba.

const SELECT_SEGURO = {
  id: true,
  email: true,
  nombre: true,
  rol: true,
  escuelaId: true,
  activo: true,
  emailVerificado: true,
  bloqueado: true,
  bloqueoTipo: true,
  bloqueoMensaje: true,
  bloqueadoEn: true,
  createdAt: true,
} as const;

export function obtenerUserSeguro(id: string) {
  return db.user.findUnique({ where: { id }, select: SELECT_SEGURO });
}

/** Usuarios para el panel del Súper Admin, con filtros opcionales. */
export function listarUsersAdmin(filtros: {
  rol?: string;
  escuelaId?: string;
  search?: string;
  skip?: number;
  take?: number;
}) {
  const searchFilter = filtros.search?.trim()
    ? {
        OR: [
          { nombre: { contains: filtros.search.trim() } },
          { email: { contains: filtros.search.trim() } },
        ],
      }
    : {};

  return db.user.findMany({
    where: {
      ...(filtros.rol ? { rol: filtros.rol } : {}),
      ...(filtros.escuelaId === "__sin__"
        ? { escuelaId: null }
        : filtros.escuelaId
        ? { escuelaId: filtros.escuelaId }
        : {}),
      ...searchFilter,
    },
    select: { ...SELECT_SEGURO, escuela: { select: { nombre: true } } },
    skip: filtros.skip,
    take: filtros.take,
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
  });
}

export function contarUsersAdmin(filtros: {
  rol?: string;
  escuelaId?: string;
  search?: string;
}) {
  const searchFilter = filtros.search?.trim()
    ? {
        OR: [
          { nombre: { contains: filtros.search.trim() } },
          { email: { contains: filtros.search.trim() } },
        ],
      }
    : {};

  return db.user.count({
    where: {
      ...(filtros.rol ? { rol: filtros.rol } : {}),
      ...(filtros.escuelaId === "__sin__"
        ? { escuelaId: null }
        : filtros.escuelaId
        ? { escuelaId: filtros.escuelaId }
        : {}),
      ...searchFilter,
    },
  });
}

export function actualizarUserDatos(
  id: string,
  data: { nombre?: string; email?: string; activo?: boolean },
) {
  return db.user.update({ where: { id }, data, select: { id: true } });
}

/** Aplica (o levanta) el bloqueo de acceso a un conjunto de usuarios. */
export function actualizarBloqueoUsers(
  ids: string[],
  data: {
    bloqueado: boolean;
    bloqueoTipo: string | null;
    bloqueoMensaje: string | null;
    bloqueadoEn: Date | null;
  },
) {
  return db.user.updateMany({ where: { id: { in: ids } }, data });
}

export function actualizarPasswordUser(id: string, passwordHash: string) {
  return db.user.update({
    where: { id },
    data: { passwordHash },
    select: { id: true },
  });
}

export function obtenerPasswordHash(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { id: true, passwordHash: true },
  });
}

// tenant-global: lookup por clave única (email) para flujos de correo
// (recuperación, set-password, OTP). No expone passwordHash.
export function buscarUserPorEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      escuelaId: true,
      activo: true,
      emailVerificado: true,
    },
  });
}

export function marcarEmailVerificado(id: string) {
  return db.user.update({
    where: { id },
    data: { emailVerificado: true, emailVerificadoEn: new Date() },
    select: { id: true },
  });
}

/** Nombres de un conjunto de usuarios por id (para resolver autores/responsables). */
export function nombresDeUsuarios(ids: string[]) {
  if (ids.length === 0) {
    return Promise.resolve([] as { id: string; nombre: string }[]);
  }
  return db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
  });
}
