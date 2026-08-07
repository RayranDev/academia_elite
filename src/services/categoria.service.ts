import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, requirePermiso } from "@/lib/auth/guards";
import { listarCategorias } from "@/repositories/categoria.repository";
import { resolverParametrosEscuela } from "@/services/parametro-escuela.service";
import {
  grupoEdadSemilla,
  rangosDesdeParametros,
  filaDesdeRangos,
} from "@/lib/stats-engine";
import type { z } from "zod";
import type { categoriaSchema } from "@/lib/validators/escuela";

export interface CategoriaDTO {
  id: string;
  nombre: string;
  anioDesde: number | null;
  anioHasta: number | null;
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
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");
  const rows = await listarCategorias(escuelaId);
  return rows.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    anioDesde: c.anioDesde,
    anioHasta: c.anioHasta,
    jugadores: c._count.jugadores,
  }));
}

/**
 * Crea la categoría y siembra su calibración física en una sola transacción
 * (Fase B): sin `CategoriaRangoFisico` la categoría no tendría con qué
 * evaluar. Se siembra con el `GrupoEdad` más cercano a su rango de años (o
 * SUB16 si es "sin edad") + los valores efectivos de la escuela (global +
 * sus overrides); de ahí en más la categoría vive con sus propios rangos.
 */
export async function crearCategoriaEscuela(
  ctx: AuthContext,
  data: z.infer<typeof categoriaSchema>,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const grupo = grupoEdadSemilla(data.anioDesde, data.anioHasta);
  const valoresEfectivos = await resolverParametrosEscuela(escuelaId);
  const rangos = rangosDesdeParametros(valoresEfectivos, grupo);

  await db.$transaction(async (tx) => {
    const categoria = await tx.categoria.create({
      data: { escuelaId, ...data },
    });
    await tx.categoriaRangoFisico.create({
      data: { escuelaId, categoriaId: categoria.id, ...filaDesdeRangos(rangos) },
    });
  });
}
