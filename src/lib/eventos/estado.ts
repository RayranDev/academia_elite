/**
 * Estado unificado de un evento (PURO: mismas entradas → misma salida, sin
 * Prisma ni React). Antes cada consumidor inferia "pasado/en curso/cancelado"
 * a su manera comparando fechas o mirando `periodo` a mano; esta es la única
 * fuente de verdad para derivarlo, así el gating de convocatoria/lista/stats
 * es consistente en todas partes.
 */

import type { EstadoEvento, TipoEvento } from "@/types";
import type { Periodo } from "@/lib/partido/periodos";

export interface DatosEstadoEvento {
  tipo: TipoEvento;
  cancelado: boolean;
  /** Solo tiene sentido para PARTIDO; null/undefined en el resto. */
  periodo?: Periodo | string | null;
  sesionCerradaAt: Date | null;
  inicio: Date;
  fin: Date;
}

export function estadoDeEvento(
  e: DatosEstadoEvento,
  ahora: Date = new Date(),
): EstadoEvento {
  if (e.cancelado) return "CANCELADO";

  if (e.tipo === "PARTIDO") {
    if (e.periodo === "FINALIZADO" || e.sesionCerradaAt) return "FINALIZADO";
    if (e.periodo && e.periodo !== "NO_INICIADO") return "EN_CURSO";
    return "PROGRAMADO";
  }

  // ENTRENAMIENTO / EVALUACION / OTRO: sin período propio (a diferencia de
  // PARTIDO, no tienen Modo Sesión hoy). Se infiere de sesionCerradaAt si en
  // el futuro lo tuvieran, y si no, de las fechas.
  if (e.sesionCerradaAt) return "FINALIZADO";
  if (ahora < e.inicio) return "PROGRAMADO";
  if (ahora > e.fin) return "FINALIZADO";
  return "EN_CURSO";
}

/** Antes de esto (PROGRAMADO) no se muestran estadísticas, aunque ya existan cargadas. */
export function permiteVerEstadisticas(estado: EstadoEvento): boolean {
  return estado === "EN_CURSO" || estado === "FINALIZADO";
}
