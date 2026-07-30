import { addWeeks } from "date-fns";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { categoriasDelDt } from "@/services/dt-scope";
import { listarHijos, listarPlantilla } from "@/repositories/jugador.repository";
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
  listarEventosPaginado,
  type FiltrosListadoEventos,
} from "@/repositories/evento.repository";
import { obtenerJugadorParaFoto } from "@/repositories/jugador.repository";
import { crearAnuncio } from "@/repositories/anuncio.repository";
import { listarObservacionesVisiblesDeEvento } from "@/repositories/observacion.repository";
import { listarSedes } from "@/repositories/sede.repository";
import type { EventoInput, EditarEventoInput, EstadisticaInput } from "@/lib/validators/evento";
import { estadoDeEvento, permiteVerEstadisticas } from "@/lib/eventos/estado";
import type { TipoEvento, Confirmacion, EstadoEvento } from "@/types";

export interface EstadisticaJugadorDTO {
  titular: boolean;
  minutos: number;
  goles: number;
  asistencias: number;
  amarillas: number;
  roja: boolean;
  azul: boolean;
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

/**
 * Crea un evento (o serie semanal). PARTIDO convoca a quien elija el DT;
 * ENTRENAMIENTO convoca automáticamente a todo el plantel activo. En ambos
 * casos, si hay convocados, se notifica a los padres.
 */
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

  // PARTIDO: convocatoria manual (la elige el DT en el form). ENTRENAMIENTO:
  // convocatoria automática a todo el plantel activo de la categoría -no
  // tenía sentido pedirle al DT que tildara jugador por jugador algo que va
  // a convocar siempre igual. EVALUACION/OTRO quedan sin convocatoria.
  //
  // En PARTIDO se INTERSECTA input.convocados con el plantel real de la
  // categoría: el categoriaId ya está validado, pero los ids de convocados
  // vienen del form y no hay que confiarlos (un request armado a mano podría
  // convocar a un jugador de OTRA escuela y filtrarle una notificación / su
  // nombre en el detalle del evento).
  let convocados: string[] = [];
  if (input.tipo === "PARTIDO" || input.tipo === "ENTRENAMIENTO") {
    const plantel = await listarPlantilla(escuelaId, [input.categoriaId]);
    const idsPlantel = plantel.map((j) => j.id);
    convocados =
      input.tipo === "PARTIDO"
        ? idsPlantel.filter((id) => (input.convocados ?? []).includes(id))
        : idsPlantel;
  }

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
      prioridad: "alta",
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

/** Evento de hoy en el home del DT: lo justo para decidir si arrancar la sesión. */
export interface EventoHoyDTO {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: string;
  categoriaNombre: string;
  cancelado: boolean;
  sesionCerradaAt: string | null;
  convocados: number;
}

/**
 * Eventos de HOY de las categorías del DT, ordenados por hora. Alimenta la
 * sección 1 del home "Hoy" (PLAN-UX-DT PR-2 · B1): es lo primero que el DT
 * necesita al abrir la app, no la plantilla.
 */
export async function eventosDeHoyDt(ctx: AuthContext): Promise<EventoHoyDTO[]> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(desde);
  hasta.setHours(23, 59, 59, 999);

  const rows = await listarEventosCategorias(escuelaId, categoriaIds, desde, hasta);
  return rows.map((e) => ({
    id: e.id,
    tipo: e.tipo as TipoEvento,
    titulo: e.titulo,
    inicio: e.inicio.toISOString(),
    categoriaNombre: e.categoria.nombre,
    cancelado: e.cancelado,
    sesionCerradaAt: e.sesionCerradaAt?.toISOString() ?? null,
    convocados: e._count?.convocados ?? 0,
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

// --- Listado general de eventos (paginado, con filtros) ---

export interface EventoListadoDTO {
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
  cancelado: boolean;
  estado: EstadoEvento;
}

export interface FiltrosListadoEventosInput {
  tipo?: TipoEvento;
  estado?: EstadoEvento;
  desde?: Date;
  hasta?: Date;
  page?: number;
  limit?: number;
}

export interface ListadoEventosDTO {
  items: EventoListadoDTO[];
  total: number;
  totalPages: number;
  page: number;
}

function aEventoListadoDTO(e: {
  id: string;
  tipo: string;
  titulo: string;
  inicio: Date;
  fin: Date;
  categoria: { nombre: string };
  rival: string | null;
  esLocal: boolean | null;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
  cancelado: boolean;
  periodo: string;
  sesionCerradaAt: Date | null;
}): EventoListadoDTO {
  return {
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
    cancelado: e.cancelado,
    estado: estadoDeEvento({
      tipo: e.tipo as TipoEvento,
      cancelado: e.cancelado,
      periodo: e.periodo,
      sesionCerradaAt: e.sesionCerradaAt,
      inicio: e.inicio,
      fin: e.fin,
    }),
  };
}

function filtrosRepo(filtros: FiltrosListadoEventosInput): FiltrosListadoEventos {
  const page = Math.max(1, filtros.page ?? 1);
  const limit = Math.max(1, filtros.limit ?? 10);
  return {
    tipo: filtros.tipo,
    estado: filtros.estado,
    desde: filtros.desde,
    hasta: filtros.hasta,
    skip: (page - 1) * limit,
    take: limit,
  };
}

/** Listado paginado de eventos de las categorías del DT (todos los tipos/estados). */
export async function listarEventosDt(
  ctx: AuthContext,
  filtros: FiltrosListadoEventosInput = {},
): Promise<ListadoEventosDTO> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const page = Math.max(1, filtros.page ?? 1);
  const limit = Math.max(1, filtros.limit ?? 10);
  const [rows, total] = await listarEventosPaginado(escuelaId, categoriaIds, filtrosRepo(filtros));
  return {
    items: rows.map(aEventoListadoDTO),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}

/** Listado paginado de eventos de las categorías de los hijos de la familia. */
export async function listarEventosJugador(
  ctx: AuthContext,
  filtros: FiltrosListadoEventosInput = {},
): Promise<ListadoEventosDTO> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) {
    return { items: [], total: 0, totalPages: 0, page: 1 };
  }
  const escuelaId = hijos[0].escuelaId;
  assertTenant(ctx, escuelaId);
  const categoriaIds = Array.from(
    new Set(hijos.filter((h) => h.escuelaId === escuelaId).map((h) => h.categoriaId)),
  );
  const page = Math.max(1, filtros.page ?? 1);
  const limit = Math.max(1, filtros.limit ?? 10);
  const [rows, total] = await listarEventosPaginado(escuelaId, categoriaIds, filtrosRepo(filtros));
  return {
    items: rows.map(aEventoListadoDTO),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
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
  /** Estado unificado (ver estadoDeEvento en src/lib/eventos/estado.ts). */
  estado: EstadoEvento;
  /** Si ya se cerró, el Modo Sesión no se reabre (se corrige desde el detalle). */
  sesionCerradaAt: string | null;
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
  const estado = estadoDeEvento({
    tipo: e.tipo as TipoEvento,
    cancelado: e.cancelado,
    periodo: e.periodo,
    sesionCerradaAt: e.sesionCerradaAt,
    inicio: e.inicio,
    fin: e.fin,
  });
  // Antes de que arranque el partido no se muestran estadísticas, aunque el DT
  // ya haya cargado una fila por error: la convocatoria/lista sí es visible
  // siempre, solo las stats individuales quedan gateadas por estado.
  const verStats = permiteVerEstadisticas(estado);
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
    estado,
    sesionCerradaAt: e.sesionCerradaAt?.toISOString() ?? null,
    resultadoLocal: e.resultadoLocal,
    resultadoVisitante: e.resultadoVisitante,
    convocados: e.convocados.map((c) => {
      const s = verStats ? stats.get(c.jugadorId) : undefined;
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
              azul: s.azul,
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
  // Solo se acepta lista de jugadores del plantel de la categoría del evento:
  // sin esto, un form armado a mano podía crear una Asistencia para un jugador
  // ajeno bajo esta escuela (mismo criterio que cargarEstadisticasDt).
  const plantel = await listarPlantilla(escuelaId, [e.categoriaId]);
  const validos = new Set(plantel.map((j) => j.id));
  const registrosValidos = registros.filter((r) => validos.has(r.jugadorId));
  if (registrosValidos.length === 0) return;
  await registrarAsistencias(escuelaId, eventoId, registrosValidos);
}

/** Datos del evento que necesita el pipeline de difusión del resultado. */
export interface EventoParaDifusion {
  titulo: string;
  categoriaId: string;
  rival: string | null;
  esLocal: boolean | null;
  convocados: { jugadorId: string }[];
}

/**
 * Publica la noticia del club y notifica a las familias con el resultado final.
 *
 * Vive extraído a propósito: lo usan `cargarResultadoDt` y el CIERRE de una
 * sesión de partido (`sesion.service`). La notificación masiva sale UNA sola
 * vez, al cierre — nunca por cada gol registrado en caliente.
 */
export async function publicarResultadoYNotificar(
  escuelaId: string,
  evento: EventoParaDifusion,
  local: number,
  visitante: number,
): Promise<void> {
  const marcador = evento.esLocal
    ? `${local}-${visitante}`
    : `${visitante}-${local}`;
  await crearAnuncio(escuelaId, {
    categoriaId: evento.categoriaId,
    autorRol: "DT",
    titulo: `Resultado: ${evento.titulo}`,
    cuerpo: `Terminó ${evento.titulo} con un ${marcador}${evento.rival ? ` ante ${evento.rival}` : ""}.`,
    visibleJugador: true,
  });

  const jugadorIds = evento.convocados.map((c) => c.jugadorId);
  const padres = await userIdsDePadres(jugadorIds);
  await notificar(padres, {
    tipo: "SISTEMA",
    titulo: "Resultado del partido",
    cuerpo: `${evento.titulo}: ${marcador}`,
    url: "/jugador/calendario",
  });
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
  await publicarResultadoYNotificar(escuelaId, e, local, visitante);
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
  // Antes solo se ocultaba el botón en la UI; un evento ya cerrado/cancelado
  // no debe poder editarse aunque alguien fuerce la request.
  const estado = estadoDeEvento({
    tipo: e.tipo as TipoEvento,
    cancelado: e.cancelado,
    periodo: e.periodo,
    sesionCerradaAt: e.sesionCerradaAt,
    inicio: e.inicio,
    fin: e.fin,
  });
  if (estado === "CANCELADO" || estado === "FINALIZADO") {
    throw new ValidationError("No se puede editar un evento cancelado o finalizado.");
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
  if (e.cancelado) {
    throw new ValidationError("El evento ya está cancelado.");
  }
  const estado = estadoDeEvento({
    tipo: e.tipo as TipoEvento,
    cancelado: e.cancelado,
    periodo: e.periodo,
    sesionCerradaAt: e.sesionCerradaAt,
    inicio: e.inicio,
    fin: e.fin,
  });
  if (estado === "FINALIZADO") {
    throw new ValidationError("No se puede cancelar un evento que ya finalizó.");
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
  estado: EstadoEvento;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
  // Línea por cada hijo de la familia que está convocado a este evento.
  misHijos: {
    jugadorId: string;
    nombre: string;
    apellido: string;
    confirmacion: Confirmacion;
    estadistica: EstadisticaJugadorDTO | null;
    // Observaciones del DT sobre este hijo en este evento que el DT marcó
    // explícitamente como visibles para la familia.
    observaciones: { texto: string; fecha: string }[];
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

  const estado = estadoDeEvento({
    tipo: e.tipo as TipoEvento,
    cancelado: e.cancelado,
    periodo: e.periodo,
    sesionCerradaAt: e.sesionCerradaAt,
    inicio: e.inicio,
    fin: e.fin,
  });
  const verStats = permiteVerEstadisticas(estado);
  const stats = new Map(e.estadisticas.map((s) => [s.jugadorId, s]));
  const idsHijos = new Set(hijos.map((h) => h.id));
  const misHijos = await Promise.all(
    e.convocados
      .filter((c) => idsHijos.has(c.jugadorId))
      .map(async (c) => {
        const s = verStats ? stats.get(c.jugadorId) : undefined;
        const obs = await listarObservacionesVisiblesDeEvento(escuelaId, e.id, c.jugadorId);
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
                azul: s.azul,
              }
            : null,
          observaciones: obs.map((o) => ({
            texto: o.texto,
            fecha: o.createdAt.toISOString(),
          })),
        };
      }),
  );

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
    estado,
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
