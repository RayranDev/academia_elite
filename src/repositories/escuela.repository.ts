import { db } from "@/lib/db";

// Repositorio de escuelas (Capa 4).
export function listarEscuelasGlobal() {
  return db.escuela.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jugadores: true, categorias: true, users: true } },
    },
  });
}

export function slugExisteGlobal(slug: string) {
  return db.escuela.findUnique({ where: { slug }, select: { id: true } });
}

export function emailExisteGlobal(email: string) {
  return db.user.findUnique({ where: { email }, select: { id: true } });
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
