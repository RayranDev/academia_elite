import { db } from "@/lib/db";

/** Ids de las categorías asignadas a un entrenador (para acotar sus consultas). */
export async function categoriaIdsDeEntrenador(
  entrenadorId: string,
): Promise<string[]> {
  const rows = await db.entrenadorCategoria.findMany({
    where: { entrenadorId },
    select: { categoriaId: true },
  });
  return rows.map((r) => r.categoriaId);
}

/** Categorías (id + nombre) asignadas a un entrenador. */
export async function categoriasDeEntrenador(entrenadorId: string) {
  const rows = await db.entrenadorCategoria.findMany({
    where: { entrenadorId },
    include: { categoria: { select: { id: true, nombre: true } } },
    orderBy: { categoria: { nombre: "asc" } },
  });
  return rows.map((r) => r.categoria);
}

// Repositorio de entrenadores/DT (Capa 4). Firma con escuelaId (multi-tenant).
export function listarEntrenadores(escuelaId: string) {
  return db.entrenador.findMany({
    where: { escuelaId },
    include: {
      user: { select: { id: true, nombre: true, email: true, activo: true } },
      categorias: { include: { categoria: { select: { id: true, nombre: true } } } },
    },
    orderBy: { user: { nombre: "asc" } },
  });
}
