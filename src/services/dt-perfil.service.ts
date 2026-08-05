import type { AuthContext } from "@/lib/auth/context";
import { inicioDeMes } from "@/lib/dt-perfil";
import { categoriasDelDt } from "@/services/dt-scope";
import { listarEvaluacionesPorEntrenador } from "@/repositories/evaluacion.repository";
import { listarEventosPaginado } from "@/repositories/evento.repository";
import { listarPlantillaDt } from "@/services/jugador.service";

/** Período elegible del perfil del DT: mes en curso o todo el histórico. */
export type PeriodoPerfilDt = "mes" | "todo";

export interface EvaluacionPerfilDTO {
  id: string;
  jugadorNombre: string;
  categoriaNombre: string;
  fecha: string;
}

export interface PartidoPerfilDTO {
  id: string;
  titulo: string;
  rival: string | null;
  esLocal: boolean | null;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
  categoriaNombre: string;
  inicio: string;
}

export interface PendienteDTO {
  id: string;
  nombre: string;
  apellido: string;
  categoriaNombre: string;
}

export interface PerfilDtDTO {
  evaluaciones: EvaluacionPerfilDTO[];
  partidos: PartidoPerfilDTO[];
  evaluadosCount: number;
  totalPlantilla: number;
  pendientes: PendienteDTO[];
}

/**
 * Perfil del DT: evaluaciones que hizo, resultados de los partidos de sus
 * categorías y su plantilla evaluada vs. pendiente, todo en el período
 * elegido. "Toda la temporada" es sin filtro de fecha (todo el histórico):
 * el modelo de datos no tiene concepto de temporada.
 */
export async function obtenerPerfilDt(
  ctx: AuthContext,
  periodo: PeriodoPerfilDt,
): Promise<PerfilDtDTO> {
  const { escuelaId, entrenadorId, categoriaIds } = await categoriasDelDt(ctx);
  const desde = periodo === "mes" ? inicioDeMes(new Date()) : undefined;

  const [evaluaciones, [partidos], plantilla] = await Promise.all([
    listarEvaluacionesPorEntrenador(escuelaId, entrenadorId, desde),
    listarEventosPaginado(escuelaId, categoriaIds, {
      tipo: "PARTIDO",
      estado: "FINALIZADO",
      desde,
      take: 50,
    }),
    listarPlantillaDt(ctx),
  ]);

  const evaluados = plantilla.filter((j) => j.card !== null);
  const pendientes = plantilla.filter((j) => j.card === null);

  return {
    evaluaciones: evaluaciones.map((e) => ({
      id: e.id,
      jugadorNombre: `${e.jugador.nombre} ${e.jugador.apellido}`,
      categoriaNombre: e.jugador.categoria.nombre,
      fecha: e.fecha.toISOString(),
    })),
    partidos: partidos.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      rival: p.rival,
      esLocal: p.esLocal,
      resultadoLocal: p.resultadoLocal,
      resultadoVisitante: p.resultadoVisitante,
      categoriaNombre: p.categoria.nombre,
      inicio: p.inicio.toISOString(),
    })),
    evaluadosCount: evaluados.length,
    totalPlantilla: plantilla.length,
    pendientes: pendientes.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      categoriaNombre: j.categoriaNombre,
    })),
  };
}
