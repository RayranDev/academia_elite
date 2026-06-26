import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import {
  contarJugadoresPorEstado,
  listarPlantillaEscuela,
  calcularAsistenciaMes,
} from "@/repositories/dashboard-escuela.repository";
import { evaluacionVencida } from "@/lib/evaluacion";

// Servicio del dashboard deportivo del ESCUELA_ADMIN (Capa 3).

/** Jugador con evaluación pendiente (vencida o sin evaluar). */
export interface PendienteDTO {
  id: string;
  nombre: string;
  apellido: string;
  categoriaNombre: string;
  /** ISO string de la última evaluación, o null si nunca fue evaluado. */
  ultimaEvaluacion: string | null;
  /** true = tiene stats pero están vencidas; false = nunca fue evaluado. */
  vencida: boolean;
}

/** DTO del resumen deportivo de la escuela. */
export interface ResumenEscuelaDTO {
  /** Código de escuela para compartir con las familias (registro/vinculación). */
  codigoRef: string | null;
  jugadoresActivos: number;
  totalJugadores: number;
  evaluacionesVencidas: number;
  sinEvaluacion: number;
  ovrPromedio: number;
  distribucionNivel: {
    bronce: number;
    plata: number;
    oro: number;
    heroe: number;
  };
  asistenciaMesPorcentaje: number;
  pendientes: PendienteDTO[];
}

/**
 * Resumen deportivo completo de la escuela para el ESCUELA_ADMIN.
 * Aplica guards RBAC y tenant antes de cualquier consulta.
 */
export async function resumenEscuela(
  ctx: AuthContext,
): Promise<ResumenEscuelaDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  // Consultas paralelas: conteos, plantilla activa, escuela y asistencia.
  const [conteos, jugadores, escuela, asistenciaMesPorcentaje] =
    await Promise.all([
      contarJugadoresPorEstado(escuelaId),
      listarPlantillaEscuela(escuelaId),
      obtenerEscuela(escuelaId),
      calcularAsistenciaMes(escuelaId),
    ]);

  const frecuencia = escuela?.frecuenciaEvaluacionDias ?? 30;
  const ahora = Date.now();

  // Métricas agregadas sobre la plantilla activa.
  let sumaOvr = 0;
  let conteoConStats = 0;
  const distribucionNivel = { bronce: 0, plata: 0, oro: 0, heroe: 0 };
  let evaluacionesVencidas = 0;
  let sinEvaluacion = 0;
  const pendientes: PendienteDTO[] = [];

  for (const j of jugadores) {
    const stats = j.stats[0] ?? null;

    if (!stats) {
      // Nunca fue evaluado.
      sinEvaluacion++;
      pendientes.push({
        id: j.id,
        nombre: j.nombre,
        apellido: j.apellido,
        categoriaNombre: j.categoria.nombre,
        ultimaEvaluacion: null,
        vencida: false,
      });
    } else {
      // Tiene stats: acumular OVR y distribución por nivel.
      sumaOvr += stats.ovr;
      conteoConStats++;

      const nivelNorm = stats.nivel.toLowerCase() as
        | "bronce"
        | "plata"
        | "oro"
        | "heroe";
      if (nivelNorm in distribucionNivel) {
        distribucionNivel[nivelNorm]++;
      }

      // Verificar vencimiento (helper compartido con listarPlantillaDt).
      const vencida = evaluacionVencida(stats.createdAt, frecuencia, ahora);
      if (vencida) {
        evaluacionesVencidas++;
        pendientes.push({
          id: j.id,
          nombre: j.nombre,
          apellido: j.apellido,
          categoriaNombre: j.categoria.nombre,
          ultimaEvaluacion: stats.createdAt.toISOString(),
          vencida: true,
        });
      }
    }
  }

  const ovrPromedio =
    conteoConStats > 0 ? Math.round(sumaOvr / conteoConStats) : 0;

  const totalJugadores =
    conteos.activos + conteos.pendientes + conteos.inactivos;

  return {
    codigoRef: escuela?.codigoRef ?? null,
    jugadoresActivos: conteos.activos,
    totalJugadores,
    evaluacionesVencidas,
    sinEvaluacion,
    ovrPromedio,
    distribucionNivel,
    asistenciaMesPorcentaje,
    pendientes,
  };
}
