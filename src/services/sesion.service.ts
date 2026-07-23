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
  upsertTarjeta,
} from "@/repositories/evento.repository";
import { obtenerJugador } from "@/repositories/jugador.repository";
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

/** Amarilla (tope 2) o roja de un jugador en el partido. */
export async function marcarTarjeta(
  ctx: AuthContext,
  input: {
    eventoId: string;
    jugadorId: string;
    tipo: "AMARILLA" | "ROJA";
  },
): Promise<void> {
  const { evento, escuelaId } = await eventoDelDt(ctx, input.eventoId);
  exigirPartido(evento.tipo);
  await upsertTarjeta(escuelaId, evento.id, input.jugadorId, input.tipo);
}
