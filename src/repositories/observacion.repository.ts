import { db } from "@/lib/db";

/**
 * Observaciones del DT sobre un jugador (Capa 4). Solo llamadas Prisma: la
 * autorización (jugador dentro de las categorías del DT) vive en el service.
 */

export function crearObservacion(
  escuelaId: string,
  data: {
    jugadorId: string;
    entrenadorId: string;
    eventoId?: string | null;
    texto: string;
    visiblePadre: boolean;
  },
) {
  return db.observacionJugador.create({
    data: {
      escuelaId,
      jugadorId: data.jugadorId,
      entrenadorId: data.entrenadorId,
      eventoId: data.eventoId ?? null,
      texto: data.texto,
      visiblePadre: data.visiblePadre,
    },
  });
}

export function listarObservacionesDeJugador(
  escuelaId: string,
  jugadorId: string,
  opciones: { soloVisiblesPadre?: boolean } = {},
) {
  return db.observacionJugador.findMany({
    where: {
      escuelaId,
      jugadorId,
      ...(opciones.soloVisiblesPadre ? { visiblePadre: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function listarObservacionesDeEvento(escuelaId: string, eventoId: string) {
  return db.observacionJugador.findMany({
    where: { escuelaId, eventoId },
    orderBy: { createdAt: "desc" },
  });
}
