import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import {
  listarCategorias,
  crearCategoria,
} from "@/repositories/categoria.repository";
import type { z } from "zod";
import type { categoriaSchema } from "@/lib/validators/escuela";

export interface CategoriaDTO {
  id: string;
  nombre: string;
  anioDesde: number;
  anioHasta: number;
  jugadores: number;
}

export async function listarCategoriasEscuela(
  ctx: AuthContext,
): Promise<CategoriaDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarCategorias(escuelaId);
  return rows.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    anioDesde: c.anioDesde,
    anioHasta: c.anioHasta,
    jugadores: c._count.jugadores,
  }));
}

/** Categorías de una escuela concreta para el panel global (Súper Admin). */
export async function listarCategoriasAdmin(
  ctx: AuthContext,
  escuelaId: string,
): Promise<CategoriaDTO[]> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const rows = await listarCategorias(escuelaId);
  return rows.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    anioDesde: c.anioDesde,
    anioHasta: c.anioHasta,
    jugadores: c._count.jugadores,
  }));
}

export async function crearCategoriaEscuela(
  ctx: AuthContext,
  data: z.infer<typeof categoriaSchema>,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  await crearCategoria(escuelaId, data);
}
