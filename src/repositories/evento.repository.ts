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
      estadisticas: true,
    },
  });
}

export function editarEvento(
  escuelaId: string,
  id: string,
  data: {
    titulo?: string;
    canchaId?: string | null;
    rival?: string | null;
    esLocal?: boolean | null;
    inicio?: Date;
    fin?: Date;
    notas?: string | null;
  },
) {
  return db.evento.updateMany({ where: { id, escuelaId }, data });
}

export function cancelarEvento(escuelaId: string, id: string) {
  return db.evento.updateMany({
    where: { id, escuelaId },
    data: { cancelado: true },
  });
}

/** Upsert de la estadística individual de cada jugador en un partido. */
export async function registrarEstadisticas(
  escuelaId: string,
  eventoId: string,
  registros: {
    jugadorId: string;
    titular: boolean;
    minutos: number;
    goles: number;
    asistencias: number;
    amarillas: number;
    roja: boolean;
  }[],
) {
  for (const r of registros) {
    const { jugadorId, ...stats } = r;
    await db.estadisticaPartido.upsert({
      where: { eventoId_jugadorId: { eventoId, jugadorId } },
      update: stats,
      create: { escuelaId, eventoId, jugadorId, ...stats },
    });
  }
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

// --- Resumen de partidos del jugador ---

/** Totales acumulados de un jugador (goles, asistencias, etc.). */
export async function resumenEstadisticasJugador(
  escuelaId: string,
  jugadorId: string,
) {
  const [agg, rojas] = await Promise.all([
    db.estadisticaPartido.aggregate({
      where: { escuelaId, jugadorId },
      _sum: { goles: true, asistencias: true, minutos: true, amarillas: true },
      _count: { _all: true },
    }),
    db.estadisticaPartido.count({ where: { escuelaId, jugadorId, roja: true } }),
  ]);
  return {
    partidos: agg._count._all,
    goles: agg._sum.goles ?? 0,
    asistencias: agg._sum.asistencias ?? 0,
    minutos: agg._sum.minutos ?? 0,
    amarillas: agg._sum.amarillas ?? 0,
    rojas,
  };
}

/** Últimos partidos con la línea individual del jugador. */
export function ultimasEstadisticasJugador(
  escuelaId: string,
  jugadorId: string,
  limite = 5,
) {
  return db.estadisticaPartido.findMany({
    where: { escuelaId, jugadorId },
    include: {
      evento: {
        select: {
          titulo: true,
          rival: true,
          inicio: true,
          esLocal: true,
          resultadoLocal: true,
          resultadoVisitante: true,
        },
      },
    },
    orderBy: { evento: { inicio: "desc" } },
    take: limite,
  });
}

// --- Curva de desarrollo: asistencia reciente ---

/** Asistencias de UN jugador desde una fecha: entrenos/partidos presentes + ausencias. */
export async function contarAsistenciasJugador(
  escuelaId: string,
  jugadorId: string,
  desde: Date,
): Promise<{ entrenos: number; partidos: number; ausencias: number }> {
  const rows = await db.asistencia.findMany({
    where: { escuelaId, jugadorId, evento: { inicio: { gte: desde } } },
    select: { presente: true, evento: { select: { tipo: true } } },
  });
  let entrenos = 0;
  let partidos = 0;
  let ausencias = 0;
  for (const r of rows) {
    if (!r.presente) ausencias++;
    else if (r.evento.tipo === "PARTIDO") partidos++;
    else if (r.evento.tipo === "ENTRENAMIENTO") entrenos++;
  }
  return { entrenos, partidos, ausencias };
}

/** Asistencias de TODA la plataforma desde una fecha (para el cron diario). */
export function asistenciasRecientesGlobal(desde: Date) {
  return db.asistencia.findMany({
    where: { evento: { inicio: { gte: desde } } },
    select: { jugadorId: true, presente: true, evento: { select: { tipo: true } } },
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
