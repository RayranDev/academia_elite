import { requireRole, requireEscuela } from "@/lib/auth/guards";
import type { AuthContext } from "@/lib/auth/context";
import { listarCategorias } from "@/repositories/categoria.repository";
import { listarPlantilla } from "@/repositories/jugador.repository";
import {
  asistenciaPorCategoria,
  asistenciaPorJugador,
  estadisticasGoleadoresByEscuela,
  eventosParaMatrizAsistencia,
  eventosCategoriaDeEscuela,
  jugadoresMinimosDeEscuela,
  jugadoresPorIds,
} from "@/repositories/gestion-deportiva.repository";
import { porcentaje } from "@/lib/evaluacion";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface AsistenciaEscuelaDTO {
  porCategoria: {
    categoriaNombre: string;
    porcentaje: number;
    presentes: number;
    total: number;
  }[];
  porJugador: {
    jugadorId: string;
    nombre: string;
    apellido: string;
    categoriaNombre: string;
    presentes: number;
    total: number;
    porcentaje: number;
  }[];
}

export interface RankingEscuelaDTO {
  topOvr: {
    jugadorId: string;
    nombre: string;
    apellido: string;
    categoriaNombre: string;
    ovr: number;
    nivel: string;
  }[];
  goleadores: {
    jugadorId: string;
    nombre: string;
    apellido: string;
    goles: number;
    asistencias: number;
  }[];
}

// ─── Servicio: asistencia ─────────────────────────────────────────────────────

/**
 * Devuelve el resumen de asistencia de la escuela agrupado por categoría y por
 * jugador. Solo accesible para ESCUELA_ADMIN.
 */
export async function obtenerAsistenciaEscuela(
  ctx: AuthContext,
): Promise<AsistenciaEscuelaDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  // 1. Categorías de la escuela
  const cats = await listarCategorias(escuelaId);

  // 2. Todos los eventos con su categoría (para construir el mapa)
  const eventos = await eventosCategoriaDeEscuela(escuelaId);

  // 3. Mapa eventoId → categoriaId
  const eventosCategoriaMap = new Map(eventos.map((e) => [e.id, e.categoriaId]));

  // 4. Asistencias agregadas en paralelo
  const [porCat, porJug] = await Promise.all([
    asistenciaPorCategoria(escuelaId, eventosCategoriaMap),
    asistenciaPorJugador(escuelaId),
  ]);

  // 5. Jugadores mínimos para cruzar nombre/apellido/categoría
  const jugadores = await jugadoresMinimosDeEscuela(escuelaId);

  // 6. Mapa categoriaId → nombre
  const catsMap = new Map(cats.map((c) => [c.id, c.nombre]));

  // 7. Por categoría: join + porcentaje + filtrar categorías sin nombre + ordenar
  const porCategoria = porCat
    .filter((row) => catsMap.has(row.categoriaId))
    .map((row) => ({
      categoriaNombre: catsMap.get(row.categoriaId)!,
      porcentaje: porcentaje(row.presentes, row.total),
      presentes: row.presentes,
      total: row.total,
    }))
    .sort((a, b) => a.categoriaNombre.localeCompare(b.categoriaNombre));

  // 8. Por jugador: cruzar con datos del jugador y con sus totales de asistencia
  const jugadoresMap = new Map(jugadores.map((j) => [j.id, j]));
  const porJugMap = new Map(porJug.map((r) => [r.jugadorId, r]));

  const porJugador = Array.from(porJugMap.entries())
    .flatMap(([jugadorId, asistencia]) => {
      const jugador = jugadoresMap.get(jugadorId);
      if (!jugador) return [];
      const categoriaNombre = catsMap.get(jugador.categoriaId) ?? "";
      return [
        {
          jugadorId,
          nombre: jugador.nombre,
          apellido: jugador.apellido,
          categoriaNombre,
          presentes: asistencia.presentes,
          total: asistencia.total,
          porcentaje: porcentaje(asistencia.presentes, asistencia.total),
        },
      ];
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  return { porCategoria, porJugador };
}

// ─── Servicio: matriz de asistencia mes × categoría (C2.5) ────────────────────

export interface AsistenciaMensualDTO {
  /** Meses en formato "yyyy-MM", del más viejo al más nuevo. */
  meses: string[];
  filas: {
    categoriaNombre: string;
    /** Una celda por mes; `porcentaje` null cuando no hubo eventos ese mes. */
    celdas: { mes: string; porcentaje: number | null }[];
  }[];
}

const MESES_MATRIZ = 6;

function claveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Matriz de asistencia de los últimos 6 meses: filas por categoría, columnas por
 * mes, cada celda con el % de presentes de ese mes (o null si no hubo eventos).
 * Solo ESCUELA_ADMIN. Reutiliza la query de la matriz de export.
 */
export async function obtenerAsistenciaMensualEscuela(
  ctx: AuthContext,
): Promise<AsistenciaMensualDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  // Ventana: primer día del mes, 5 meses atrás → cubre 6 meses con el actual.
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES_MATRIZ - 1), 1);

  const meses: string[] = [];
  for (let i = 0; i < MESES_MATRIZ; i++) {
    meses.push(claveMes(new Date(desde.getFullYear(), desde.getMonth() + i, 1)));
  }

  const [categorias, eventos] = await Promise.all([
    listarCategorias(escuelaId),
    eventosParaMatrizAsistencia(escuelaId, desde),
  ]);

  // Acumulador: categoriaId → mes → { presentes, total }
  const acc = new Map<string, Map<string, { presentes: number; total: number }>>();
  for (const e of eventos) {
    const mes = claveMes(new Date(e.inicio));
    const porMes = acc.get(e.categoriaId) ?? new Map();
    const cur = porMes.get(mes) ?? { presentes: 0, total: 0 };
    for (const a of e.asistencias) {
      cur.total += 1;
      if (a.presente) cur.presentes += 1;
    }
    porMes.set(mes, cur);
    acc.set(e.categoriaId, porMes);
  }

  const filas = categorias
    .map((c) => ({
      categoriaNombre: c.nombre,
      celdas: meses.map((mes) => {
        const d = acc.get(c.id)?.get(mes);
        return {
          mes,
          porcentaje: d && d.total > 0 ? porcentaje(d.presentes, d.total) : null,
        };
      }),
    }))
    .sort((a, b) => a.categoriaNombre.localeCompare(b.categoriaNombre));

  return { meses, filas };
}

// ─── Servicio: ranking ────────────────────────────────────────────────────────

/**
 * Devuelve el ranking de la escuela: top 20 por OVR y top 10 goleadores.
 * Solo accesible para ESCUELA_ADMIN.
 */
export async function obtenerRankingEscuela(
  ctx: AuthContext,
): Promise<RankingEscuelaDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  // 1. Categorías de la escuela
  const cats = await listarCategorias(escuelaId);
  const categoriaIds = cats.map((c) => c.id);

  // 2. Plantilla completa y estadísticas de goleadores en paralelo
  const [plantilla, estadisticas] = await Promise.all([
    listarPlantilla(escuelaId, categoriaIds),
    estadisticasGoleadoresByEscuela(escuelaId),
  ]);

  // 3. Top OVR: solo jugadores con stats calculadas, ordenados por ovr desc
  const topOvr = plantilla
    .filter((j) => j.stats.length > 0)
    .map((j) => ({
      jugadorId: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      categoriaNombre: j.categoria.nombre,
      ovr: j.stats[0].ovr,
      nivel: j.stats[0].nivel,
    }))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 20);

  // 4. Goleadores: cruzar estadísticas con nombres de la plantilla
  const nombresMap = new Map(
    plantilla.map((j) => [j.id, { nombre: j.nombre, apellido: j.apellido }]),
  );

  // Buscar jugadores que aparecen en estadísticas pero no están en la plantilla
  // (p.ej. jugadores inactivos o de otras categorías)
  const missingIds = estadisticas
    .map((e) => e.jugadorId)
    .filter((id) => !nombresMap.has(id));

  if (missingIds.length > 0) {
    const extras = await jugadoresPorIds(escuelaId, missingIds);
    for (const j of extras) {
      nombresMap.set(j.id, { nombre: j.nombre, apellido: j.apellido });
    }
  }

  const goleadores = estadisticas
    .flatMap((e) => {
      const jugador = nombresMap.get(e.jugadorId);
      if (!jugador) return [];
      return [
        {
          jugadorId: e.jugadorId,
          nombre: jugador.nombre,
          apellido: jugador.apellido,
          goles: e.goles,
          asistencias: e.asistencias,
        },
      ];
    })
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 10);

  return { topOvr, goleadores };
}
