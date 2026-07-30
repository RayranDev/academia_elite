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

/** Título y tipo de varios eventos por id (para enriquecer observaciones sin relación Prisma). */
export function eventosPorIds(escuelaId: string, ids: string[]) {
  if (ids.length === 0) {
    return Promise.resolve([] as { id: string; titulo: string; tipo: string }[]);
  }
  return db.evento.findMany({
    where: { escuelaId, id: { in: ids } },
    select: { id: true, titulo: true, tipo: true },
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
    azul: boolean;
  }[],
) {
  for (const r of registros) {
    const { jugadorId, ...stats } = r;
    // tenant-global: upsert por clave única evento+jugador; evento ya tenant-scoped en el service
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
    include: {
      categoria: { select: { nombre: true } },
      // El home "Hoy" muestra a cuántos convocó sin traerse la convocatoria.
      _count: { select: { convocados: true } },
    },
    orderBy: { inicio: "asc" },
  });
}

export interface FiltrosListadoEventos {
  tipo?: string;
  /** Refleja estadoDeEvento() (src/lib/eventos/estado.ts) como where de Prisma:
   *  es la ÚNICA otra fuente que conoce esas reglas, así que si cambia una,
   *  cambia la otra. */
  estado?: "PROGRAMADO" | "EN_CURSO" | "FINALIZADO" | "CANCELADO";
  desde?: Date;
  hasta?: Date;
  skip?: number;
  take?: number;
}

/**
 * Solo la porción de filtro por tipo/estado/rango de fechas -NUNCA incluye
 * escuelaId/categoriaId: eso se agrega inline en cada llamada de
 * listarEventosPaginado() para que el test guardián de aislamiento por tenant
 * (tests/unit/aislamiento-tenant.test.ts) pueda verlo por análisis estático.
 */
function filtroPorTipoEstadoFecha(filtros: FiltrosListadoEventos, ahora: Date) {
  const comun = {
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(filtros.desde || filtros.hasta
      ? {
          inicio: {
            ...(filtros.desde ? { gte: filtros.desde } : {}),
            ...(filtros.hasta ? { lte: filtros.hasta } : {}),
          },
        }
      : {}),
  };

  if (!filtros.estado) return comun;
  if (filtros.estado === "CANCELADO") return { ...comun, cancelado: true };

  const noPartido = { tipo: { not: "PARTIDO" } };
  if (filtros.estado === "PROGRAMADO") {
    return {
      ...comun,
      cancelado: false,
      OR: [
        { tipo: "PARTIDO", periodo: "NO_INICIADO", sesionCerradaAt: null },
        { ...noPartido, inicio: { gt: ahora }, sesionCerradaAt: null },
      ],
    };
  }
  if (filtros.estado === "EN_CURSO") {
    return {
      ...comun,
      cancelado: false,
      OR: [
        {
          tipo: "PARTIDO",
          periodo: { notIn: ["NO_INICIADO", "FINALIZADO"] },
          sesionCerradaAt: null,
        },
        { ...noPartido, inicio: { lte: ahora }, fin: { gte: ahora }, sesionCerradaAt: null },
      ],
    };
  }
  // FINALIZADO
  return {
    ...comun,
    cancelado: false,
    OR: [
      { sesionCerradaAt: { not: null } },
      { tipo: "PARTIDO", periodo: "FINALIZADO" },
      { ...noPartido, fin: { lt: ahora } },
    ],
  };
}

/** Listado paginado de eventos con filtros (tipo/estado/rango de fechas). */
export function listarEventosPaginado(
  escuelaId: string,
  categoriaIds: string[],
  filtros: FiltrosListadoEventos,
) {
  const extra = filtroPorTipoEstadoFecha(filtros, new Date());
  return Promise.all([
    db.evento.findMany({
      where: { escuelaId, categoriaId: { in: categoriaIds }, ...extra },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { inicio: "desc" },
      skip: filtros.skip,
      take: filtros.take,
    }),
    db.evento.count({
      where: { escuelaId, categoriaId: { in: categoriaIds }, ...extra },
    }),
  ]);
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
    // tenant-global: upsert por clave única evento+jugador; evento ya tenant-scoped en el service
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

// --- Modo Sesión (PLAN-UX-DT PR-1) ---

/** Upsert de UNA marca de asistencia (guardado optimista, un toque = una escritura). */
export async function upsertAsistencia(
  escuelaId: string,
  eventoId: string,
  jugadorId: string,
  data: {
    presente: boolean;
    justificado: boolean;
    llegoTarde?: boolean;
    salioAntes?: boolean;
    agregadoEnCancha?: boolean;
    esCorreccion?: boolean; // true si el evento ya estaba cerrado
    corregidoPorId?: string;
  },
): Promise<void> {
  const { esCorreccion, corregidoPorId, ...campos } = data;
  // tenant-global: upsert por clave única evento+jugador; el evento ya viene
  // tenant-scoped y validado contra las categorías del DT en el service.
  await db.asistencia.upsert({
    where: { eventoId_jugadorId: { eventoId, jugadorId } },
    create: { escuelaId, eventoId, jugadorId, ...campos, marcadoAt: new Date() },
    update: {
      ...campos,
      ...(esCorreccion
        ? { corregidoAt: new Date(), corregidoPorId }
        : { marcadoAt: new Date() }),
    },
  });
}

/**
 * Marca el arranque de la sesión SOLO si aún no arrancó: re-entrar al modo no
 * resetea el cronómetro. Devuelve la cantidad de filas tocadas (0 = ya estaba).
 */
export async function marcarSesionIniciada(escuelaId: string, eventoId: string) {
  return db.evento.updateMany({
    where: { id: eventoId, escuelaId, sesionIniciadaAt: null },
    data: { sesionIniciadaAt: new Date() },
  });
}

/** Cierra la sesión y guarda la nota general del paso de cierre. */
export async function cerrarSesionEvento(
  escuelaId: string,
  eventoId: string,
  notaSesion: string | null,
) {
  return db.evento.updateMany({
    where: { id: eventoId, escuelaId },
    data: { sesionCerradaAt: new Date(), notaSesion },
  });
}

/** Convoca a un jugador si aún no lo estaba (alta en cancha). */
export async function crearConvocadoSiFalta(eventoId: string, jugadorId: string) {
  // tenant-global: clave compuesta evento+jugador; ambos validados en el service.
  await db.jugadorConvocado.upsert({
    where: { eventoId_jugadorId: { eventoId, jugadorId } },
    create: { eventoId, jugadorId },
    update: {},
  });
}

/**
 * Registra (o deshace) un gol EN VIVO de forma atómica: mueve el marcador y, si
 * es gol propio con anotador, la estadística individual. `delta` es 1 o -1 y
 * ningún contador baja de 0. Devuelve el marcador ya actualizado.
 */
export async function ajustarGolVivo(input: {
  escuelaId: string;
  eventoId: string;
  esLocal: boolean; // el equipo propio juega de local
  esRival: boolean;
  delta: number;
  anotadorId?: string | null;
  asistenteId?: string | null;
}): Promise<{ local: number; visitante: number }> {
  const { escuelaId, eventoId, esLocal, esRival, delta } = input;
  return db.$transaction(async (tx) => {
    const e = await tx.evento.findFirst({
      where: { id: eventoId, escuelaId },
      select: { resultadoLocal: true, resultadoVisitante: true },
    });
    let local = e?.resultadoLocal ?? 0;
    let visitante = e?.resultadoVisitante ?? 0;

    // El lado propio es "local" si el equipo juega de local; el rival, el otro.
    const tocaLocal = esRival ? !esLocal : esLocal;
    if (tocaLocal) local = Math.max(0, local + delta);
    else visitante = Math.max(0, visitante + delta);

    await tx.evento.updateMany({
      where: { id: eventoId, escuelaId },
      data: { resultadoLocal: local, resultadoVisitante: visitante },
    });

    // El gol propio alimenta marcador Y stat individual en la misma operación.
    if (!esRival && input.anotadorId) {
      await sumarStat(tx, escuelaId, eventoId, input.anotadorId, "goles", delta);
    }
    if (!esRival && input.asistenteId) {
      await sumarStat(tx, escuelaId, eventoId, input.asistenteId, "asistencias", delta);
    }

    return { local, visitante };
  });
}

/** Suma `delta` a un contador de EstadisticaPartido sin bajar de 0. */
async function sumarStat(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  escuelaId: string,
  eventoId: string,
  jugadorId: string,
  campo: "goles" | "asistencias",
  delta: number,
): Promise<void> {
  // tenant-global: lookup por la clave única evento+jugador; `ajustarGolVivo` ya
  // validó el evento contra el escuelaId al abrir la transacción.
  const actual = await tx.estadisticaPartido.findUnique({
    where: { eventoId_jugadorId: { eventoId, jugadorId } },
    select: { goles: true, asistencias: true },
  });
  const valor = Math.max(0, (actual?.[campo] ?? 0) + delta);
  // tenant-global: mismo par único que el findUnique de arriba; el escuelaId se
  // persiste en el create para que la fila quede acotada al tenant.
  await tx.estadisticaPartido.upsert({
    where: { eventoId_jugadorId: { eventoId, jugadorId } },
    create: { escuelaId, eventoId, jugadorId, [campo]: valor },
    update: { [campo]: valor },
  });
}

/**
 * Mueve el partido al período indicado. `periodoIniciadoAt` es la base del
 * cronómetro: se setea al arrancar un tiempo jugado y se limpia en los descansos
 * y en penales, donde el reloj no corre.
 */
export async function avanzarPeriodoEvento(
  escuelaId: string,
  eventoId: string,
  datos: { periodo: string; periodoIniciadoAt: Date | null },
): Promise<void> {
  await db.evento.updateMany({
    where: { id: eventoId, escuelaId },
    data: datos,
  });
}

/**
 * Suma o resta un penal de la definición, de forma atómica y sin bajar de 0.
 * Es un marcador APARTE del de juego: en el fútbol los penales definen, pero no
 * cambian el resultado del partido (un 2-2 (4-3) sigue siendo un empate).
 * Devuelve el marcador de penales ya actualizado.
 */
export async function ajustarPenal(input: {
  escuelaId: string;
  eventoId: string;
  esLocal: boolean; // el equipo propio juega de local
  esRival: boolean;
  delta: number;
}): Promise<{ local: number; visitante: number }> {
  const { escuelaId, eventoId, esLocal, esRival, delta } = input;
  return db.$transaction(async (tx) => {
    const e = await tx.evento.findFirst({
      where: { id: eventoId, escuelaId },
      select: { penalesLocal: true, penalesVisitante: true },
    });
    let local = e?.penalesLocal ?? 0;
    let visitante = e?.penalesVisitante ?? 0;

    const tocaLocal = esRival ? !esLocal : esLocal;
    if (tocaLocal) local = Math.max(0, local + delta);
    else visitante = Math.max(0, visitante + delta);

    await tx.evento.updateMany({
      where: { id: eventoId, escuelaId },
      data: { penalesLocal: local, penalesVisitante: visitante },
    });
    return { local, visitante };
  });
}

/**
 * Fija el estado ABSOLUTO de tarjetas del jugador en el partido (amarillas y
 * roja). Absoluto —y no incremental— para que el DT pueda tanto AGREGAR como
 * QUITAR una tarjeta en vivo sin esperar al cierre. El clamp/regla ya la aplicó
 * el service.
 */
export async function fijarTarjetas(
  escuelaId: string,
  eventoId: string,
  jugadorId: string,
  datos: { amarillas: number; roja: boolean },
): Promise<void> {
  // tenant-global: upsert por la clave única evento+jugador; el evento ya viene
  // tenant-scoped y validado contra las categorías del DT en el service.
  await db.estadisticaPartido.upsert({
    where: { eventoId_jugadorId: { eventoId, jugadorId } },
    create: { escuelaId, eventoId, jugadorId, ...datos },
    update: datos,
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
  // tenant-global: cron diario de curva; agrega asistencias de todas las escuelas
  return db.asistencia.findMany({
    where: { evento: { inicio: { gte: desde } } },
    select: { jugadorId: true, presente: true, evento: { select: { tipo: true } } },
  });
}

/** Padres (userId) de los jugadores convocados, para notificar. */
export async function padresDeJugadores(jugadorIds: string[]) {
  // tenant-global: ids ya tenant-scoped por la convocatoria; solo lee contactos para notificar
  const jugadores = await db.jugador.findMany({
    where: { id: { in: jugadorIds } },
    select: { id: true, padreUserId: true, cuentaUserId: true },
  });
  return jugadores;
}
