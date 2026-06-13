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

/** Un entrenador asignado a una categoría (para imputar evaluaciones del SA). */
export async function entrenadorDeCategoria(
  categoriaId: string,
): Promise<string | null> {
  const row = await db.entrenadorCategoria.findFirst({
    where: { categoriaId },
    select: { entrenadorId: true },
  });
  return row?.entrenadorId ?? null;
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

export function obtenerEntrenador(escuelaId: string, id: string) {
  return db.entrenador.findFirst({
    where: { id, escuelaId },
    include: {
      user: { select: { id: true, nombre: true, email: true, activo: true } },
      categorias: { select: { categoriaId: true } },
    },
  });
}

/** Sustituye las categorías asignadas a un entrenador (atómico). */
export function reemplazarCategoriasEntrenador(
  entrenadorId: string,
  categoriaIds: string[],
) {
  return db.$transaction([
    db.entrenadorCategoria.deleteMany({ where: { entrenadorId } }),
    db.entrenadorCategoria.createMany({
      data: categoriaIds.map((categoriaId) => ({ entrenadorId, categoriaId })),
    }),
  ]);
}
