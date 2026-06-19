import { addWeeks } from "date-fns";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { categoriasDelDt } from "@/services/dt-scope";
import { listarHijos } from "@/repositories/jugador.repository";
import { notificar } from "@/services/notificacion.service";
import {
  crearEvento,
  convocarJugadores,
  obtenerEvento,
  listarEventosCategorias,
  actualizarConfirmacion,
  obtenerConvocatoria,
  registrarAsistencias,
  cargarResultado as cargarResultadoRepo,
  editarEvento,
  cancelarEvento,
  registrarEstadisticas,
  resumenEstadisticasJugador,
  ultimasEstadisticasJugador,
  proximosEventosDeCategoria,
  ultimoPartidoDeCategoria,
  padresDeJugadores,
} from "@/repositories/evento.repository";
import { obtenerJugadorParaFoto } from "@/repositories/jugador.repository";
import { crearAnuncio } from "@/repositories/anuncio.repository";
import { listarSedes } from "@/repositories/sede.repository";
import type { EventoInput, EditarEventoInput, EstadisticaInput } from "@/lib/validators/evento";
import type { TipoEvento, Confirmacion } from "@/types";

export interface EstadisticaJugadorDTO {
  titular: boolean;
  minutos: number;
  goles: number;
  asistencias: number;
  amarillas: number;
  roja: boolean;
}

export interface EventoCalendarioDTO {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: string;
  fin: string;
  categoriaNombre: string;
  rival: string | null;
  esLocal: boolean | null;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
}

async function userIdsDePadres(jugadorIds: string[]): Promise<string[]> {
  const padres = await padresDeJugadores(jugadorIds);
  const ids: string[] = [];
  for (const p of padres) {
    if (p.padreUserId) ids.push(p.padreUserId);
    if (p.cuentaUserId) ids.push(p.cuentaUserId);
  }
  return ids;
}

/** Crea un evento (o serie semanal). Para PARTIDO convoca y notifica a los padres. */
export async function crearEventoDt(
  ctx: AuthContext,
  input: EventoInput,
): Promise<{ creados: number }> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  if (!categoriaIds.includes(input.categoriaId)) {
    throw new ValidationError("Esa categoría no está entre las tuyas.");
  }

  // Fechas de la serie (recurrencia semanal opcional).
  const fechas: { inicio: Date; fin: Date }[] = [];
  let inicio = input.inicio;
  let fin = input.fin;
  if (input.repetirSemanal && input.repetirHasta) {
    while (inicio <= input.repetirHasta) {
      fechas.push({ inicio, fin });
      inicio = addWeeks(inicio, 1);
      fin = addWeeks(fin, 1);
    }
  } else {
    fechas.push({ inicio, fin });
  }

  const convocados = input.tipo === "PARTIDO" ? (input.convocados ?? []) : [];

  for (const f of fechas) {
    const evento = await crearEvento(escuelaId, {
      categoriaId: input.categoriaId,
      tipo: input.tipo,
      titulo: input.titulo,
      canchaId: input.canchaId || null,
      rival: input.rival || null,
      esLocal: input.esLocal ?? null,
      inicio: f.inicio,
      fin: f.fin,
      notas: input.notas || null,
    });
    if (convocados.length > 0) {
      await convocarJugadores(evento.id, convocados);
    }
  }

  if (convocados.length > 0) {
    const padres = await userIdsDePadres(convocados);
    await notificar(padres, {
      tipo: "CONVOCATORIA",
      titulo: "Nueva convocatoria",
      cuerpo: `Tu hijo/a fue convocado para "${input.titulo}".`,
      url: "/jugador/calendario",
    });
  }

  return { creados: fechas.length };
}

/** Canchas de la escuela del DT (para asignar al crear/editar eventos). */
export async function listarCanchasDt(
  ctx: AuthContext,
): Promise<{ id: string; nombre: string }[]> {
  const { escuelaId } = await categoriasDelDt(ctx);
  const sedes = await listarSedes(escuelaId);
  return sedes.flatMap((s) =>
    s.canchas.map((c) => ({ id: c.id, nombre: `${s.nombre} · ${c.nombre}` })),
  );
}

export async function listarCalendarioDt(
  ctx: AuthContext,
  desde: Date,
  hasta: Date,
): Promise<EventoCalendarioDTO[]> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const rows = await listarEventosCategorias(escuelaId, categoriaIds, desde, hasta);
  return rows.map((e) => ({
    id: e.id,
    tipo: e.tipo as TipoEvento,
    titulo: e.titulo,
    inicio: e.inicio.toISOString(),
    fin: e.fin.toISOString(),
    categoriaNombre: e.categoria.nombre,
    rival: e.rival,
    esLocal: e.esLocal,
    resultadoLocal: e.resultadoLocal,
    resultadoVisitante: e.resultadoVisitante,
  }));
}

/**
 * Calendario para la familia: eventos de las categorías de sus hijos en el
 * rango dado. Solo el responsable (rol JUGADOR) ve los eventos de su escuela.
 */
export async function listarCalendarioJugador(
  ctx: AuthContext,
  desde: Date,
  hasta: Date,
): Promise<EventoCalendarioDTO[]> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) return [];

  // Todos los hijos comparten la escuela de la familia (el primero la fija);
  // se unen las categorías de los hijos de esa misma escuela.
  const escuelaId = hijos[0].escuelaId;
  assertTenant(ctx, escuelaId);
  const categoriaIds = Array.from(
    new Set(
      hijos.filter((h) => h.escuelaId === escuelaId).map((h) => h.categoriaId),
    ),
  );

  const rows = await listarEventosCategorias(escuelaId, categoriaIds, desde, hasta);
  return rows.map((e) => ({
    id: e.id,
    tipo: e.tipo as TipoEvento,
    titulo: e.titulo,
    inicio: e.inicio.toISOString(),
    fin: e.fin.toISOString(),
    categoriaNombre: e.categoria.nombre,
    rival: e.rival,
    esLocal: e.esLocal,
    resultadoLocal: e.resultadoLocal,
    resultadoVisitante: e.resultadoVisitante,
  }));
}

export interface EventoDetalleDTO {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: string;
  fin: string;
  categoriaId: string;
  categoriaNombre: string;
  canchaId: string | null;
  canchaNombre: string | null;
  rival: string | null;
  esLocal: boolean | null;
  notas: string | null;
  cancelado: boolean;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
  convocados: {
    jugadorId: string;
    nombre: string;
    apellido: string;
    confirmacion: Confirmacion;
    presente: boolean | null;
    estadistica: EstadisticaJugadorDTO | null;
  }[];
}

export async function obtenerDetalleEventoDt(
  ctx: AuthContext,
  eventoId: string,
): Promise<EventoDetalleDTO> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const e = await obtenerEvento(escuelaId, eventoId);
  if (!e || !categoriaIds.includes(e.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }
  const presencia = new Map(e.asistencias.map((a) => [a.jugadorId, a.presente]));
  const stats = new Map(e.estadisticas.map((s) => [s.jugadorId, s]));
  return {
    id: e.id,
    tipo: e.tipo as TipoEvento,
    titulo: e.titulo,
    inicio: e.inicio.toISOString(),
    fin: e.fin.toISOString(),
    categoriaId: e.categoriaId,
    categoriaNombre: e.categoria.nombre,
    canchaId: e.canchaId,
    canchaNombre: e.cancha?.nombre ?? null,
    rival: e.rival,
    esLocal: e.esLocal,
    notas: e.notas,
    cancelado: e.cancelado,
    resultadoLocal: e.resultadoLocal,
    resultadoVisitante: e.resultadoVisitante,
    convocados: e.convocados.map((c) => {
      const s = stats.get(c.jugadorId);
      return {
        jugadorId: c.jugadorId,
        nombre: c.jugador.nombre,
        apellido: c.jugador.apellido,
        confirmacion: c.confirmacion as Confirmacion,
        presente: presencia.get(c.jugadorId) ?? null,
        estadistica: s
          ? {
              titular: s.titular,
              minutos: s.minutos,
              goles: s.goles,
              asistencias: s.asistencias,
              amarillas: s.amarillas,
              roja: s.roja,
            }
          : null,
      };
    }),
  };
}

/** El padre confirma o rechaza una convocatoria de su hijo. */
export async function confirmarConvocatoria(
  ctx: AuthContext,
  eventoId: string,
  jugadorId: string,
  confirmacion: Confirmacion,
): Promise<void> {
  requireRole(ctx, ["JUGADOR"]);
  const jugador = await obtenerJugadorParaFoto(ctx.escuelaId, jugadorId);
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, jugador.escuelaId);
  if (ctx.userId !== jugador.padreUserId && ctx.userId !== jugador.cuentaUserId) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  const conv = await obtenerConvocatoria(eventoId, jugadorId);
  if (!conv) throw new NotFoundError("Convocatoria no encontrada.");
  await actualizarConfirmacion(eventoId, jugadorId, confirmacion);
}

export async function pasarListaDt(
  ctx: AuthContext,
  eventoId: string,
  registros: { jugadorId: string; presente: boolean }[],
): Promise<void> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const e = await obtenerEvento(escuelaId, eventoId);
  if (!e || !categoriaIds.includes(e.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }
  await registrarAsistencias(escuelaId, eventoId, registros);
}

/** Carga el resultado de un partido y genera la noticia del club + notificación. */
export async function cargarResultadoDt(
  ctx: AuthContext,
  eventoId: string,
  local: number,
  visitante: number,
): Promise<void> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const e = await obtenerEvento(escuelaId, eventoId);
  if (!e || !categoriaIds.includes(e.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }
  if (e.tipo !== "PARTIDO") {
    throw new ValidationError("Solo los partidos tienen resultado.");
  }
  await cargarResultadoRepo(escuelaId, eventoId, local, visitante);

  const marcador = e.esLocal
    ? `${local}-${visitante}`
    : `${visitante}-${local}`;
  await crearAnuncio(escuelaId, {
    categoriaId: e.categoriaId,
    autorRol: "DT",
    titulo: `Resultado: ${e.titulo}`,
    cuerpo: `Terminó ${e.titulo} con un ${marcador}${e.rival ? ` ante ${e.rival}` : ""}.`,
    visibleJugador: true,
  });

  const jugadorIds = e.convocados.map((c) => c.jugadorId);
  const padres = await userIdsDePadres(jugadorIds);
  await notificar(padres, {
    tipo: "SISTEMA",
    titulo: "Resultado del partido",
    cuerpo: `${e.titulo}: ${marcador}`,
    url: "/jugador/calendario",
  });
}

/** Carga/actualiza la estadística individual de los convocados a un partido. */
export async function cargarEstadisticasDt(
  ctx: AuthContext,
  eventoId: string,
  registros: (EstadisticaInput & { jugadorId: string })[],
): Promise<void> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const e = await obtenerEvento(escuelaId, eventoId);
  if (!e || !categoriaIds.includes(e.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }
  if (e.tipo !== "PARTIDO") {
    throw new ValidationError("Solo los partidos tienen estadística individual.");
  }
  // Solo se aceptan estadísticas de jugadores convocados al partido.
  const convocados = new Set(e.convocados.map((c) => c.jugadorId));
  const validos = registros.filter((r) => convocados.has(r.jugadorId));
  if (validos.length === 0) return;
  await registrarEstadisticas(escuelaId, eventoId, validos);
}

/** Edita los datos de un evento (no cambia la categoría ni los convocados). */
export async function editarEventoDt(
  ctx: AuthContext,
  eventoId: string,
  input: EditarEventoInput,
): Promise<void> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const e = await obtenerEvento(escuelaId, eventoId);
  if (!e || !categoriaIds.includes(e.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }
  await editarEvento(escuelaId, eventoId, {
    titulo: input.titulo,
    canchaId: input.canchaId || null,
    rival: input.rival || null,
    esLocal: input.esLocal ?? null,
    inicio: input.inicio,
    fin: input.fin,
    notas: input.notas || null,
  });
}

/** Cancela un evento y avisa a las familias de los convocados. */
export async function cancelarEventoDt(
  ctx: AuthContext,
  eventoId: string,
): Promise<void> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const e = await obtenerEvento(escuelaId, eventoId);
  if (!e || !categoriaIds.includes(e.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }
  await cancelarEvento(escuelaId, eventoId);
  const padres = await userIdsDePadres(e.convocados.map((c) => c.jugadorId));
  if (padres.length > 0) {
    await notificar(padres, {
      tipo: "SISTEMA",
      titulo: "Evento cancelado",
      cuerpo: `Se canceló "${e.titulo}".`,
      url: "/jugador/calendario",
    });
  }
}

// --- Detalle de evento para la familia ---

export interface EventoDetalleJugadorDTO {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: string;
  fin: string;
  categoriaNombre: string;
  canchaNombre: string | null;
  rival: string | null;
  esLocal: boolean | null;
  cancelado: boolean;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
  // Línea por cada hijo de la familia que está convocado a este evento.
  misHijos: {
    jugadorId: string;
    nombre: string;
    apellido: string;
    confirmacion: Confirmacion;
    estadistica: EstadisticaJugadorDTO | null;
  }[];
}

export async function obtenerDetalleEventoJugador(
  ctx: AuthContext,
  eventoId: string,
): Promise<EventoDetalleJugadorDTO> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) throw new NotFoundError("Evento no encontrado.");
  const escuelaId = hijos[0].escuelaId;
  assertTenant(ctx, escuelaId);

  const e = await obtenerEvento(escuelaId, eventoId);
  // Solo si el evento es de una categoría de alguno de sus hijos.
  const misCategorias = new Set(hijos.map((h) => h.categoriaId));
  if (!e || !misCategorias.has(e.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }

  const stats = new Map(e.estadisticas.map((s) => [s.jugadorId, s]));
  const idsHijos = new Set(hijos.map((h) => h.id));
  const misHijos = e.convocados
    .filter((c) => idsHijos.has(c.jugadorId))
    .map((c) => {
      const s = stats.get(c.jugadorId);
      return {
        jugadorId: c.jugadorId,
        nombre: c.jugador.nombre,
        apellido: c.jugador.apellido,
        confirmacion: c.confirmacion as Confirmacion,
        estadistica: s
          ? {
              titular: s.titular,
              minutos: s.minutos,
              goles: s.goles,
              asistencias: s.asistencias,
              amarillas: s.amarillas,
              roja: s.roja,
            }
          : null,
      };
    });

  return {
    id: e.id,
    tipo: e.tipo as TipoEvento,
    titulo: e.titulo,
    inicio: e.inicio.toISOString(),
    fin: e.fin.toISOString(),
    categoriaNombre: e.categoria.nombre,
    canchaNombre: e.cancha?.nombre ?? null,
    rival: e.rival,
    esLocal: e.esLocal,
    cancelado: e.cancelado,
    resultadoLocal: e.resultadoLocal,
    resultadoVisitante: e.resultadoVisitante,
    misHijos,
  };
}

// --- Resumen de partidos del jugador (hub) ---

export interface ResumenPartidosDTO {
  partidos: number;
  goles: number;
  asistencias: number;
  minutos: number;
  amarillas: number;
  rojas: number;
  ultimos: {
    titulo: string;
    rival: string | null;
    inicio: string;
    goles: number;
    asistencias: number;
  }[];
}

export async function resumenPartidosJugador(
  escuelaId: string,
  jugadorId: string,
): Promise<ResumenPartidosDTO> {
  const [totales, ultimos] = await Promise.all([
    resumenEstadisticasJugador(escuelaId, jugadorId),
    ultimasEstadisticasJugador(escuelaId, jugadorId),
  ]);
  return {
    ...totales,
    ultimos: ultimos.map((s) => ({
      titulo: s.evento.titulo,
      rival: s.evento.rival,
      inicio: s.evento.inicio.toISOString(),
      goles: s.goles,
      asistencias: s.asistencias,
    })),
  };
}

// --- Hub del jugador ---

export interface ProximoEventoDTO {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: string;
  rival: string | null;
  esLocal: boolean | null;
  canchaNombre: string | null;
  convocado: boolean;
  confirmacion: Confirmacion | null;
}

export async function proximosEventosJugador(
  escuelaId: string,
  categoriaId: string,
  jugadorId: string,
): Promise<ProximoEventoDTO[]> {
  const rows = await proximosEventosDeCategoria(escuelaId, categoriaId, jugadorId);
  return rows.map((e) => {
    const conv = e.convocados[0];
    return {
      id: e.id,
      tipo: e.tipo as TipoEvento,
      titulo: e.titulo,
      inicio: e.inicio.toISOString(),
      rival: e.rival,
      esLocal: e.esLocal,
      canchaNombre: e.cancha?.nombre ?? null,
      convocado: !!conv,
      confirmacion: conv ? (conv.confirmacion as Confirmacion) : null,
    };
  });
}

export interface UltimoPartidoDTO {
  titulo: string;
  rival: string | null;
  esLocal: boolean | null;
  resultadoLocal: number;
  resultadoVisitante: number;
  inicio: string;
}

export async function ultimoPartidoJugador(
  escuelaId: string,
  categoriaId: string,
): Promise<UltimoPartidoDTO | null> {
  const e = await ultimoPartidoDeCategoria(escuelaId, categoriaId);
  if (!e || e.resultadoLocal === null || e.resultadoVisitante === null) {
    return null;
  }
  return {
    titulo: e.titulo,
    rival: e.rival,
    esLocal: e.esLocal,
    resultadoLocal: e.resultadoLocal,
    resultadoVisitante: e.resultadoVisitante,
    inicio: e.inicio.toISOString(),
  };
}
