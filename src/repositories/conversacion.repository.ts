import { db } from "@/lib/db";

export function crearConversacionConMensaje(
  escuelaId: string,
  jugadorId: string,
  asunto: string,
  remitenteId: string,
  cuerpo: string,
) {
  return db.conversacion.create({
    data: {
      escuelaId,
      jugadorId,
      asunto,
      mensajes: { create: { remitenteId, cuerpo } },
    },
  });
}

export function agregarMensaje(
  conversacionId: string,
  remitenteId: string,
  cuerpo: string,
) {
  return db.$transaction([
    db.mensaje.create({ data: { conversacionId, remitenteId, cuerpo } }),
    db.conversacion.update({
      where: { id: conversacionId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

export function obtenerConversacion(escuelaId: string, id: string) {
  return db.conversacion.findFirst({
    where: { id, escuelaId },
    include: {
      mensajes: {
        include: {
          remitente: { select: { id: true, nombre: true, rol: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function listarConversacionesDeJugadores(
  escuelaId: string,
  jugadorIds: string[],
) {
  return db.conversacion.findMany({
    where: { escuelaId, jugadorId: { in: jugadorIds } },
    include: {
      mensajes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function listarConversacionesEscuela(escuelaId: string) {
  return db.conversacion.findMany({
    where: { escuelaId },
    include: { mensajes: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
}

/** Marca como leídos los mensajes de la conversación NO enviados por el lector. */
export function marcarMensajesLeidos(
  conversacionId: string,
  lectorId: string,
) {
  return db.mensaje.updateMany({
    where: {
      conversacionId,
      remitenteId: { not: lectorId },
      leidoPorDestinatario: false,
    },
    data: { leidoPorDestinatario: true },
  });
}
