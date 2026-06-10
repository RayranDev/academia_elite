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
