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
 * Eventos con asistencia para el export en matriz (una columna por fecha). Trae
 * entrenamientos y partidos NO cancelados desde `desde`, con la marca de cada
 * jugador (presente / justificado / llegó tarde). Multi-tenant por escuelaId.
 */
export function eventosParaMatrizAsistencia(escuelaId: string, desde: Date) {
  return db.evento.findMany({
    where: {
      escuelaId,
      cancelado: false,
      tipo: { in: ["ENTRENAMIENTO", "PARTIDO"] },
      inicio: { gte: desde },
    },
    select: {
      id: true,
      categoriaId: true,
      inicio: true,
      tipo: true,
      asistencias: {
        select: {
          jugadorId: true,
          presente: true,
          justificado: true,
          llegoTarde: true,
        },
      },
    },
    orderBy: { inicio: "asc" },
  });
}

/**
 * Partidos con resultado cargado, con la línea individual de cada jugador, para
 * el export de resultados. Multi-tenant por escuelaId.
 */
export function partidosParaExport(escuelaId: string) {
  return db.evento.findMany({
    where: {
      escuelaId,
      tipo: "PARTIDO",
      cancelado: false,
      OR: [{ resultadoLocal: { not: null } }, { resultadoVisitante: { not: null } }],
    },
    select: {
      id: true,
      titulo: true,
      rival: true,
      esLocal: true,
      inicio: true,
      resultadoLocal: true,
      resultadoVisitante: true,
      categoria: { select: { nombre: true } },
      estadisticas: {
        select: {
          goles: true,
          asistencias: true,
          minutos: true,
          amarillas: true,
          roja: true,
          jugador: { select: { nombre: true, apellido: true } },
        },
      },
    },
    orderBy: { inicio: "desc" },
  });
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
