import type { AuthContext } from "@/lib/auth/context";
import { inicioDeMes } from "@/lib/dt-perfil";
import {
  agregarInsumosPorJugador,
  calcularMenBonus,
  calcularRendimientoBonus,
  inicioVentanaCurva,
} from "@/lib/curva";
import { categoriasDelDt } from "@/services/dt-scope";
import { listarEvaluacionesPorEntrenador } from "@/repositories/evaluacion.repository";
import {
  asistenciasRecientesDeJugadores,
  estadisticasRecientesDeJugadores,
  listarEventosPaginado,
} from "@/repositories/evento.repository";
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

export interface ProgresoMenDTO {
  jugadorId: string;
  nombre: string;
  apellido: string;
  categoriaNombre: string;
  bonusAsistencia: number;
  bonusRendimiento: number;
  bonusTotal: number;
  entrenos: number;
  partidos: number;
  ausencias: number;
  goles: number;
  asistenciasGol: number;
  rojas: number;
}

export interface PerfilDtDTO {
  evaluaciones: EvaluacionPerfilDTO[];
  partidos: PartidoPerfilDTO[];
  evaluadosCount: number;
  totalPlantilla: number;
  pendientes: PendienteDTO[];
  /** Progreso de MEN (asistencia + rendimiento) de la plantilla, SIEMPRE en la
   * ventana móvil de 30 días de la curva (`CURVA.VENTANA_DIAS`) — independiente
   * del selector `periodo` de esta pantalla: es el mismo número que ya afecta
   * `Jugador.menBonus` (lo que ve la familia en la carta), no "temporada". */
  progresoMen: ProgresoMenDTO[];
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

  // `plantilla` tiene que estar resuelta antes de poder armar `jugadorIds`
  // para las queries de progreso de MEN, así que va en su propio await.
  const plantilla = await listarPlantillaDt(ctx);
  const jugadorIds = plantilla.map((j) => j.id);
  const desdeVentanaCurva = inicioVentanaCurva(new Date());

  const [evaluaciones, [partidos], asistencias, estadisticas] = await Promise.all([
    listarEvaluacionesPorEntrenador(escuelaId, entrenadorId, desde),
    listarEventosPaginado(escuelaId, categoriaIds, {
      tipo: "PARTIDO",
      estado: "FINALIZADO",
      desde,
      take: 50,
    }),
    asistenciasRecientesDeJugadores(escuelaId, jugadorIds, desdeVentanaCurva),
    estadisticasRecientesDeJugadores(escuelaId, jugadorIds, desdeVentanaCurva),
  ]);

  const evaluados = plantilla.filter((j) => j.card !== null);
  const pendientes = plantilla.filter((j) => j.card === null);

  const insumos = agregarInsumosPorJugador(asistencias, estadisticas);
  const progresoMen: ProgresoMenDTO[] = plantilla.map((j) => {
    const entrada = insumos.get(j.id);
    const asistencia = entrada?.asistencia ?? { entrenos: 0, partidos: 0, ausencias: 0 };
    const rendimiento = entrada?.rendimiento ?? { goles: 0, asistenciasGol: 0, rojas: 0 };
    const bonusAsistencia = calcularMenBonus(asistencia);
    const bonusRendimiento = calcularRendimientoBonus(rendimiento);
    return {
      jugadorId: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      categoriaNombre: j.categoriaNombre,
      bonusAsistencia,
      bonusRendimiento,
      bonusTotal: Math.round((bonusAsistencia + bonusRendimiento) * 10) / 10,
      entrenos: asistencia.entrenos,
      partidos: asistencia.partidos,
      ausencias: asistencia.ausencias,
      goles: rendimiento.goles,
      asistenciasGol: rendimiento.asistenciasGol,
      rojas: rendimiento.rojas,
    };
  });

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
    progresoMen,
  };
}
