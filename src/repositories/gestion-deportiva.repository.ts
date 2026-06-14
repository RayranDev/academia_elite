import { db } from "@/lib/db";

// Repositorio para datos agregados de gestión deportiva (Capa 4).
// Multi-tenant: todas las queries filtran por escuelaId.

export interface AsistenciaCategoriaRow {
  categoriaId: string;
  presentes: number;
  total: number;
}

export interface AsistenciaJugadorRow {
  jugadorId: string;
  presentes: number;
  total: number;
}

export interface EstadisticaGrupoRow {
  jugadorId: string;
  goles: number;
  asistencias: number;
}

/**
 * Agrega asistencias por categoría usando el mapa eventoId → categoriaId
 * provisto por el servicio (evita un join extra en DB).
 */
export async function asistenciaPorCategoria(
  escuelaId: string,
  eventosCategoriaMap: Map<string, string>,
): Promise<AsistenciaCategoriaRow[]> {
  const rows = await db.asistencia.findMany({
    where: { escuelaId },
    select: { eventoId: true, presente: true },
  });

  // Agrupación en memoria: Map<categoriaId, { presentes, total }>
  const acc = new Map<string, { presentes: number; total: number }>();

  for (const row of rows) {
    const categoriaId = eventosCategoriaMap.get(row.eventoId);
    if (categoriaId === undefined) continue;

    const entry = acc.get(categoriaId) ?? { presentes: 0, total: 0 };
    entry.total += 1;
    if (row.presente) entry.presentes += 1;
    acc.set(categoriaId, entry);
  }

  return Array.from(acc.entries()).map(([categoriaId, { presentes, total }]) => ({
    categoriaId,
    presentes,
    total,
  }));
}

/**
 * Agrega asistencias por jugador dentro de la escuela.
 */
export async function asistenciaPorJugador(
  escuelaId: string,
): Promise<AsistenciaJugadorRow[]> {
  const rows = await db.asistencia.findMany({
    where: { escuelaId },
    select: { jugadorId: true, presente: true },
  });

  const acc = new Map<string, { presentes: number; total: number }>();

  for (const row of rows) {
    const entry = acc.get(row.jugadorId) ?? { presentes: 0, total: 0 };
    entry.total += 1;
    if (row.presente) entry.presentes += 1;
    acc.set(row.jugadorId, entry);
  }

  return Array.from(acc.entries()).map(([jugadorId, { presentes, total }]) => ({
    jugadorId,
    presentes,
    total,
  }));
}

/**
 * Top 10 goleadores de la escuela usando groupBy en DB.
 */
export async function estadisticasGoleadoresByEscuela(
  escuelaId: string,
): Promise<EstadisticaGrupoRow[]> {
  const grupos = await db.estadisticaPartido.groupBy({
    by: ["jugadorId"],
    where: { escuelaId },
    _sum: { goles: true, asistencias: true },
    orderBy: { _sum: { goles: "desc" } },
    take: 10,
  });

  return grupos.map((g) => ({
    jugadorId: g.jugadorId,
    goles: g._sum.goles ?? 0,
    asistencias: g._sum.asistencias ?? 0,
  }));
}
