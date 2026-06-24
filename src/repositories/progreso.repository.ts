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
  // tenant-global: lookup por clave única (jugadorId+semana); jugador ya autorizado
  return db.progresoSemanal.findUnique({
    where: { jugadorId_semana: { jugadorId, semana } },
  });
}

/** Jugadores (de la lista dada) que ya validaron una semana concreta. */
export function listarSemana(
  escuelaId: string,
  semana: string,
  jugadorIds: string[],
) {
  return db.progresoSemanal.findMany({
    where: { escuelaId, semana, jugadorId: { in: jugadorIds } },
    select: { jugadorId: true },
  });
}

export function crearProgresoSemana(data: CrearProgresoInput) {
  return db.progresoSemanal.create({ data });
}
