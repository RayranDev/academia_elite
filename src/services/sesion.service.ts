import type { AuthContext } from "@/lib/auth/context";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { categoriasDelDt } from "@/services/dt-scope";
import {
  obtenerEvento,
  upsertAsistencia,
  marcarSesionIniciada,
  cerrarSesionEvento,
  crearConvocadoSiFalta,
  ajustarGolVivo,
  fijarTarjetas,
  avanzarPeriodoEvento,
  ajustarPenal,
} from "@/repositories/evento.repository";
import {
  esPeriodo,
  puedeAvanzar,
  enJuego,
  aceptaGoles,
  type Periodo,
} from "@/lib/partido/periodos";
import {
  obtenerJugador,
  listarPlantilla,
} from "@/repositories/jugador.repository";
import { crearObservacion as crearObservacionRepo } from "@/repositories/observacion.repository";
import { publicarResultadoYNotificar } from "@/services/evento.service";

/**
 * Modo Sesión (PLAN-UX-DT PR-1): el DT corre el evento como flujo guiado
 * (lista → vivo → cierre). Todo se guarda por toque, así que salir del modo
 * nunca pierde datos. Capa 3: autoriza y decide; el acceso a datos es del repo.
 */

export type EstadoAsistencia = "PRESENTE" | "AUSENTE" | "JUSTIFICADO";

/** Estado de 3 posiciones de la UI → columnas de Asistencia (ver schema). */
function mapearEstado(estado: EstadoAsistencia): {
  presente: boolean;
  justificado: boolean;
} {
  switch (estado) {
    case "PRESENTE":
      return { presente: true, justificado: false };
    case "AUSENTE":
      return { presente: false, justificado: false };
    case "JUSTIFICADO":
      return { presente: false, justificado: true };
  }
}

/**
 * Verifica que el evento exista y pertenezca a una categoría del DT. Se reusa en
 * TODAS las funciones: es la barrera de autorización del modo.
 */
async function eventoDelDt(ctx: AuthContext, eventoId: string) {
  const { escuelaId, categoriaIds, entrenadorId } = await categoriasDelDt(ctx);
  const evento = await obtenerEvento(escuelaId, eventoId);
  if (!evento || !categoriaIds.includes(evento.categoriaId)) {
    throw new NotFoundError("Evento no encontrado.");
  }
  return { evento, escuelaId, entrenadorId, categoriaIds };
}

function exigirPartido(tipo: string): void {
  if (tipo !== "PARTIDO") {
    throw new ValidationError("Esta acción solo aplica a partidos.");
  }
}

/** Estadística individual del partido (la que alimenta el gol en vivo). */
export interface EstadisticaSesionDTO {
  minutos: number;
  goles: number;
  asistencias: number;
  amarillas: number;
  roja: boolean;
}

export interface ConvocadoSesionDTO {
  jugadorId: string;
  nombre: string;
  apellido: string;
  confirmacion: string;
  /** null = todavía sin marcar por el DT. */
  estado: EstadoAsistencia | null;
  llegoTarde: boolean;
  salioAntes: boolean;
  agregadoEnCancha: boolean;
  estadistica: EstadisticaSesionDTO;
}

export interface SesionDTO {
  eventoId: string;
  tipo: string;
  titulo: string;
  categoriaNombre: string;
  sesionIniciadaAt: string | null;
  sesionCerradaAt: string | null;
  notaSesion: string | null;
  // Solo PARTIDO: el marcador en vivo y de qué lado juega el equipo propio.
  rival: string | null;
  esLocal: boolean | null;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
  /** Partido v2: momento del partido y reloj del período en curso. */
  periodo: Periodo;
  periodoIniciadoAt: string | null;
  penalesLocal: number | null;
  penalesVisitante: number | null;
  convocados: ConvocadoSesionDTO[];
  /** Jugadores de la categoría sin convocar, para sumarlos en cancha. */
  disponibles: { id: string; nombre: string; apellido: string }[];
}

const SIN_ESTADISTICA: EstadisticaSesionDTO = {
  minutos: 0,
  goles: 0,
  asistencias: 0,
  amarillas: 0,
  roja: false,
};

/** Estado de la asistencia guardada → estado de 3 posiciones de la UI. */
function estadoDe(a: {
  presente: boolean;
  justificado: boolean;
}): EstadoAsistencia {
  if (a.presente) return "PRESENTE";
  return a.justificado ? "JUSTIFICADO" : "AUSENTE";
}

/** Todo lo que el Modo Sesión necesita para arrancar (PLAN-UX-DT PR-3 §3.2). */
export async function obtenerSesionDt(
  ctx: AuthContext,
  eventoId: string,
): Promise<SesionDTO> {
  const { evento, escuelaId } = await eventoDelDt(ctx, eventoId);
  const plantilla = await listarPlantilla(escuelaId, [evento.categoriaId]);

  const asistencias = new Map(evento.asistencias.map((a) => [a.jugadorId, a]));
  const estadisticas = new Map(evento.estadisticas.map((s) => [s.jugadorId, s]));
  const convocadosIds = new Set(evento.convocados.map((c) => c.jugadorId));

  /**
   * A quién se le pasa lista:
   *  - PARTIDO con convocatoria: a los convocados (decisión deportiva).
   *  - PARTIDO sin convocar a nadie: a TODA la categoría. Si se creó el partido
   *    sin convocatoria, con los convocados la lista saldría VACÍA y el DT no
   *    podría trabajar; caemos al plantel completo, como en un entrenamiento.
   *  - Entrenamiento y demás: a TODA la categoría. Esos eventos no tienen
   *    convocatoria (el alta ni la ofrece) y se espera al plantel completo.
   */
  const esPartido = evento.tipo === "PARTIDO";
  const usarConvocatoria = esPartido && evento.convocados.length > 0;
  const base = usarConvocatoria
    ? evento.convocados.map((c) => ({
        jugadorId: c.jugadorId,
        nombre: c.jugador.nombre,
        apellido: c.jugador.apellido,
        confirmacion: c.confirmacion,
      }))
    : plantilla.map((j) => ({
        jugadorId: j.id,
        nombre: j.nombre,
        apellido: j.apellido,
        // Sin convocatoria no hay confirmación de la familia que pre-llenar.
        confirmacion: "PENDIENTE",
      }));

  return {
    eventoId: evento.id,
    tipo: evento.tipo,
    titulo: evento.titulo,
    categoriaNombre: evento.categoria.nombre,
    sesionIniciadaAt: evento.sesionIniciadaAt?.toISOString() ?? null,
    sesionCerradaAt: evento.sesionCerradaAt?.toISOString() ?? null,
    notaSesion: evento.notaSesion,
    rival: evento.rival,
    esLocal: evento.esLocal,
    resultadoLocal: evento.resultadoLocal,
    resultadoVisitante: evento.resultadoVisitante,
    periodo: periodoDe(evento.periodo),
    periodoIniciadoAt: evento.periodoIniciadoAt?.toISOString() ?? null,
    penalesLocal: evento.penalesLocal,
    penalesVisitante: evento.penalesVisitante,
    convocados: base.map((c) => {
      const a = asistencias.get(c.jugadorId);
      const s = estadisticas.get(c.jugadorId);
      return {
        ...c,
        estado: a ? estadoDe(a) : null,
        llegoTarde: a?.llegoTarde ?? false,
        salioAntes: a?.salioAntes ?? false,
        agregadoEnCancha: a?.agregadoEnCancha ?? false,
        estadistica: s
          ? {
              minutos: s.minutos,
              goles: s.goles,
              asistencias: s.asistencias,
              amarillas: s.amarillas,
              roja: s.roja,
            }
          : SIN_ESTADISTICA,
      };
    }),
    // Solo tiene sentido sumar en cancha cuando hubo convocatoria previa. Si el
    // partido cayó al plantel completo, ya están todos en la lista.
    disponibles: usarConvocatoria
      ? plantilla
          .filter((j) => !convocadosIds.has(j.id))
          .map((j) => ({ id: j.id, nombre: j.nombre, apellido: j.apellido }))
      : [],
  };
}

/**
 * Marca la asistencia de UN jugador (un toque = una escritura). Si el evento ya
 * estaba cerrado, la marca se registra como CORRECCIÓN (queda quién y cuándo).
 */
export async function marcarAsistenciaUnitaria(
  ctx: AuthContext,
  input: {
    eventoId: string;
    jugadorId: string;
    estado: EstadoAsistencia;
    llegoTarde?: boolean;
    salioAntes?: boolean;
  },
): Promise<void> {
  const { evento, escuelaId } = await eventoDelDt(ctx, input.eventoId);
  await upsertAsistencia(escuelaId, evento.id, input.jugadorId, {
    ...mapearEstado(input.estado),
    llegoTarde: input.llegoTarde ?? false,
    salioAntes: input.salioAntes ?? false,
    esCorreccion: !!evento.sesionCerradaAt,
    corregidoPorId: ctx.userId,
  });
}

/** Arranca el cronómetro. Re-entrar al modo NO lo resetea. */
export async function iniciarSesion(
  ctx: AuthContext,
  eventoId: string,
): Promise<void> {
  const { evento, escuelaId } = await eventoDelDt(ctx, eventoId);
  await marcarSesionIniciada(escuelaId, evento.id);
}

/**
 * Cierra la sesión. Si es PARTIDO y hay resultado cargado en vivo, ACÁ (y solo
 * acá) sale la noticia del club y la notificación a las familias: una sola vez,
 * por más goles que se hayan registrado en caliente.
 */
export async function cerrarSesion(
  ctx: AuthContext,
  input: { eventoId: string; notaSesion?: string },
): Promise<void> {
  const { evento, escuelaId } = await eventoDelDt(ctx, input.eventoId);
  await cerrarSesionEvento(escuelaId, evento.id, input.notaSesion ?? null);

  // Cerrar la sesión de un partido lo da por terminado también en la línea de
  // períodos, aunque el DT no haya tocado "Finalizar" (el cierre manda).
  if (evento.tipo === "PARTIDO" && periodoDe(evento.periodo) !== "FINALIZADO") {
    await avanzarPeriodoEvento(escuelaId, evento.id, {
      periodo: "FINALIZADO",
      periodoIniciadoAt: null,
    });
  }

  const hayResultado =
    evento.resultadoLocal !== null || evento.resultadoVisitante !== null;
  if (evento.tipo === "PARTIDO" && hayResultado) {
    await publicarResultadoYNotificar(
      escuelaId,
      evento,
      evento.resultadoLocal ?? 0,
      evento.resultadoVisitante ?? 0,
    );
  }
}

/**
 * Suma un jugador a la convocatoria durante la sesión (llegó sin estar citado) y
 * lo deja presente. Solo jugadores de la MISMA categoría del evento.
 */
export async function agregarConvocadoEnCancha(
  ctx: AuthContext,
  input: { eventoId: string; jugadorId: string },
): Promise<void> {
  const { evento, escuelaId } = await eventoDelDt(ctx, input.eventoId);
  const jugador = await obtenerJugador(escuelaId, input.jugadorId);
  if (!jugador || jugador.categoriaId !== evento.categoriaId) {
    throw new ValidationError("El jugador no pertenece a la categoría del evento.");
  }

  await crearConvocadoSiFalta(evento.id, jugador.id);
  await upsertAsistencia(escuelaId, evento.id, jugador.id, {
    presente: true,
    justificado: false,
    agregadoEnCancha: true,
    esCorreccion: !!evento.sesionCerradaAt,
    corregidoPorId: ctx.userId,
  });
}

/** Observación del DT sobre un jugador de sus categorías. */
export async function crearObservacion(
  ctx: AuthContext,
  input: {
    jugadorId: string;
    eventoId?: string;
    texto: string;
    visiblePadre: boolean;
  },
): Promise<void> {
  const { escuelaId, categoriaIds, entrenadorId } = await categoriasDelDt(ctx);
  const jugador = await obtenerJugador(escuelaId, input.jugadorId);
  if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  await crearObservacionRepo(escuelaId, {
    jugadorId: jugador.id,
    entrenadorId,
    eventoId: input.eventoId ?? null,
    texto: input.texto,
    visiblePadre: input.visiblePadre,
  });
}

/**
 * Registra (delta 1) o deshace (delta -1) un gol en vivo. Mueve el marcador y,
 * si es gol propio con anotador, su estadística individual. NO notifica: la
 * difusión a familias ocurre solo en `cerrarSesion`.
 */
export async function registrarGolVivo(
  ctx: AuthContext,
  input: {
    eventoId: string;
    anotadorId?: string;
    asistenteId?: string;
    esRival: boolean;
    delta: 1 | -1;
  },
): Promise<{ local: number; visitante: number }> {
  const { evento, escuelaId } = await eventoDelDt(ctx, input.eventoId);
  exigirPartido(evento.tipo);
  // Si el DT está usando los períodos, no se cargan goles en un descanso, en
  // penales ni con el partido terminado. Si NUNCA los usó (NO_INICIADO), se deja
  // pasar: el flujo simple de siempre tiene que seguir funcionando igual.
  const periodo = periodoDe(evento.periodo);
  if (periodo !== "NO_INICIADO" && !aceptaGoles(periodo)) {
    throw new ValidationError(
      "El partido no está en juego: no se pueden cargar goles ahora.",
    );
  }
  return ajustarGolVivo({
    escuelaId,
    eventoId: evento.id,
    esLocal: evento.esLocal ?? true,
    esRival: input.esRival,
    delta: input.delta,
    anotadorId: input.anotadorId,
    asistenteId: input.asistenteId,
  });
}

/** Lee el período guardado, cayendo a NO_INICIADO si el dato viniera raro. */
function periodoDe(valor: string): Periodo {
  return esPeriodo(valor) ? valor : "NO_INICIADO";
}

/**
 * Avanza el partido al siguiente período. El destino se valida contra la máquina
 * pura: desde el 2do tiempo se puede finalizar, ir a alargue o ir a penales, pero
 * NO saltar de cualquier lado a cualquier lado — un toque errado en cancha no
 * puede mandar el partido a penales.
 *
 * El cronómetro se reinicia por período: arranca al entrar a un tiempo jugado y
 * se apaga en descansos y penales, donde el reloj no corre.
 */
export async function avanzarPeriodoPartido(
  ctx: AuthContext,
  input: { eventoId: string; destino: string },
): Promise<{ periodo: Periodo; periodoIniciadoAt: string | null }> {
  const { evento, escuelaId } = await eventoDelDt(ctx, input.eventoId);
  exigirPartido(evento.tipo);

  const actual = periodoDe(evento.periodo);
  if (!esPeriodo(input.destino)) {
    throw new ValidationError("Período inválido.");
  }
  const destino: Periodo = input.destino;
  if (!puedeAvanzar(actual, destino)) {
    throw new ValidationError(
      "Ese no es un paso válido desde el momento actual del partido.",
    );
  }

  const iniciadoAt = enJuego(destino) ? new Date() : null;
  await avanzarPeriodoEvento(escuelaId, evento.id, {
    periodo: destino,
    periodoIniciadoAt: iniciadoAt,
  });
  return { periodo: destino, periodoIniciadoAt: iniciadoAt?.toISOString() ?? null };
}

/**
 * Registra (delta 1) o deshace (delta -1) un penal de la definición. Marcador
 * aparte del de juego: los penales definen quién pasa, pero el resultado del
 * partido sigue siendo el del tiempo jugado.
 */
export async function registrarPenalVivo(
  ctx: AuthContext,
  input: { eventoId: string; esRival: boolean; delta: 1 | -1 },
): Promise<{ local: number; visitante: number }> {
  const { evento, escuelaId } = await eventoDelDt(ctx, input.eventoId);
  exigirPartido(evento.tipo);
  if (periodoDe(evento.periodo) !== "PENALES") {
    throw new ValidationError("El partido no está en definición por penales.");
  }
  return ajustarPenal({
    escuelaId,
    eventoId: evento.id,
    esLocal: evento.esLocal ?? true,
    esRival: input.esRival,
    delta: input.delta,
  });
}

/**
 * Fija las tarjetas de un jugador en el partido. El estado es absoluto (cuántas
 * amarillas, si hay roja) para que el DT pueda AGREGAR o QUITAR en vivo. Regla
 * de fútbol: dos amarillas equivalen a una roja, así que a partir de 2 amarillas
 * la roja queda implícita.
 */
export async function fijarTarjetasJugador(
  ctx: AuthContext,
  input: {
    eventoId: string;
    jugadorId: string;
    amarillas: number;
    roja: boolean;
  },
): Promise<void> {
  const { evento, escuelaId } = await eventoDelDt(ctx, input.eventoId);
  exigirPartido(evento.tipo);
  const amarillas = Math.min(Math.max(0, Math.trunc(input.amarillas)), 2);
  const roja = input.roja || amarillas >= 2; // 2 amarillas = roja
  await fijarTarjetas(escuelaId, evento.id, input.jugadorId, { amarillas, roja });
}
