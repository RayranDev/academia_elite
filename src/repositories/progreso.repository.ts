import { db } from "@/lib/db";

export interface CrearProgresoInput {
  escuelaId: string;
  jugadorId: string;
  semana: string;
  academico: boolean;
  comportamiento: boolean;
  puntualidad: boolean;
  ayudaCasa: boolean;
  valores: boolean;
  nota: string | null;
  validadoPorId: string;
}

/** Semanas validadas del jugador, la más reciente primero. */
export function listarProgresosJugador(escuelaId: string, jugadorId: string) {
  return db.progresoSemanal.findMany({
    where: { escuelaId, jugadorId },
    orderBy: { semana: "desc" },
    take: 26,
  });
}

export function obtenerProgresoSemana(jugadorId: string, semana: string) {
  return db.progresoSemanal.findUnique({
    where: { jugadorId_semana: { jugadorId, semana } },
  });
}

export function crearProgresoSemana(data: CrearProgresoInput) {
  return db.progresoSemanal.create({ data });
}
