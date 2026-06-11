import { db } from "@/lib/db";

// Repositorio de objetivos de desarrollo (Capa 4).
export function crearObjetivo(
  escuelaId: string,
  data: {
    jugadorId: string;
    creadoPorEntrenadorId: string;
    stat: string;
    valorMeta: number;
    fechaLimite: Date;
  },
) {
  return db.objetivoJugador.create({ data: { escuelaId, ...data } });
}
