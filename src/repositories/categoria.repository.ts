import { db } from "@/lib/db";

// Repositorio de categorías (Capa 4). Firma con escuelaId (multi-tenant).
export function listarCategorias(escuelaId: string) {
  return db.categoria.findMany({
    where: { escuelaId },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { jugadores: true } } },
  });
}

export function crearCategoria(
  escuelaId: string,
  data: { nombre: string; anioDesde: number; anioHasta: number },
) {
  return db.categoria.create({ data: { escuelaId, ...data } });
}

export function contarCategoriasDeEscuela(escuelaId: string, ids: string[]) {
  return db.categoria.count({ where: { escuelaId, id: { in: ids } } });
}
