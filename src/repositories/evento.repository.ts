import { db } from "@/lib/db";

// Repositorio de eventos (Capa 4). Firma con escuelaId (multi-tenant).

export function crearEvento(
  escuelaId: string,
  data: {
    categoriaId: string;
    tipo: string;
    titulo: string;
    canchaId?: string | null;
    rival?: string | null;
    esLocal?: boolean | null;
    inicio: Date;
    fin: Date;
    notas?: string | null;
  },
) {
  return db.evento.create({ data: { escuelaId, ...data } });
}

export function convocarJugadores(eventoId: string, jugadorIds: string[]) {
  return db.jugadorConvocado.createMany({
    data: jugadorIds.map((jugadorId) => ({ eventoId, jugadorId })),
  });
}

export function obtenerEvento(escuelaId: string, id: string) {
  return db.evento.findFirst({
    where: { id, escuelaId },
    include: {
      categoria: { select: { id: true, nombre: true } },
      cancha: { select: { nombre: true } },
      convocados: {
        include: {
          jugador: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      asistencias: true,
    },
  });
}

export function listarEventosCategorias(
  escuelaId: string,
  categoriaIds: string[],
  desde: Date,
  hasta: Date,
) {
  return db.evento.findMany({
    where: {
      escuelaId,
      categoriaId: { in: categoriaIds },
      inicio: { gte: desde, lte: hasta },
    },
    include: { categoria: { select: { nombre: true } } },
    orderBy: { inicio: "asc" },
  });
}

export function actualizarConfirmacion(
  eventoId: string,
  jugadorId: string,
  confirmacion: string,
) {
  return db.jugadorConvocado.update({
    where: { eventoId_jugadorId: { eventoId, jugadorId } },
    data: { confirmacion, confirmadoEn: new Date() },
  });
}

export function obtenerConvocatoria(eventoId: string, jugadorId: string) {
  return db.jugadorConvocado.findUnique({
    where: { eventoId_jugadorId: { eventoId, jugadorId } },
  });
}

export async function registrarAsistencias(
  escuelaId: string,
  eventoId: string,
  registros: { jugadorId: string; presente: boolean }[],
) {
  // upsert por (eventoId, jugadorId)
  for (const r of registros) {
    await db.asistencia.upsert({
      where: { eventoId_jugadorId: { eventoId, jugadorId: r.jugadorId } },
      update: { presente: r.presente },
      create: {
        escuelaId,
        eventoId,
        jugadorId: r.jugadorId,
        presente: r.presente,
      },
    });
  }
}

export function cargarResultado(
  escuelaId: string,
  eventoId: string,
  local: number,
  visitante: number,
) {
  return db.evento.updateMany({
    where: { id: eventoId, escuelaId },
    data: { resultadoLocal: local, resultadoVisitante: visitante },
  });
}

// --- Para el hub del jugador ---

export function proximosEventosDeCategoria(
  escuelaId: string,
  categoriaId: string,
  jugadorId: string,
  limite = 5,
) {
  return db.evento.findMany({
    where: { escuelaId, categoriaId, inicio: { gte: new Date() } },
    include: {
      convocados: { where: { jugadorId } },
      cancha: { select: { nombre: true } },
    },
    orderBy: { inicio: "asc" },
    take: limite,
  });
}

export function ultimoPartidoDeCategoria(
  escuelaId: string,
  categoriaId: string,
) {
  return db.evento.findFirst({
    where: {
      escuelaId,
      categoriaId,
      tipo: "PARTIDO",
      inicio: { lt: new Date() },
      resultadoLocal: { not: null },
    },
    orderBy: { inicio: "desc" },
  });
}

/** Padres (userId) de los jugadores convocados, para notificar. */
export async function padresDeJugadores(jugadorIds: string[]) {
  const jugadores = await db.jugador.findMany({
    where: { id: { in: jugadorIds } },
    select: { id: true, padreUserId: true, cuentaUserId: true },
  });
  return jugadores;
}
