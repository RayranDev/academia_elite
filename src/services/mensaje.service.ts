import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { notificar } from "@/services/notificacion.service";
import {
  obtenerJugadorParaFoto,
  listarHijos,
  jugadorIdsDeCategorias,
} from "@/repositories/jugador.repository";
import { categoriaIdsDeEntrenador } from "@/repositories/entrenador.repository";
import {
  crearConversacionConMensaje,
  agregarMensaje,
  obtenerConversacion,
  listarConversacionesDeJugadores,
  listarConversacionesEscuela,
  marcarMensajesLeidos,
} from "@/repositories/conversacion.repository";
import {
  crearAnuncio,
  listarAnunciosParaCategorias,
  listarAnunciosEscuela,
} from "@/repositories/anuncio.repository";

type JugadorAcc = NonNullable<
  Awaited<ReturnType<typeof obtenerJugadorParaFoto>>
>;

/** Verifica que el ctx puede acceder a la conversación de un jugador concreto. */
async function autorizarJugador(
  ctx: AuthContext,
  jugadorId: string,
): Promise<JugadorAcc> {
  const jugador = await obtenerJugadorParaFoto(jugadorId);
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, jugador.escuelaId);

  if (ctx.rol === "JUGADOR") {
    if (
      ctx.userId !== jugador.padreUserId &&
      ctx.userId !== jugador.cuentaUserId
    ) {
      throw new NotFoundError("Jugador no encontrado.");
    }
  } else if (ctx.rol === "DT") {
    if (!ctx.entrenadorId) throw new ForbiddenError();
    const cats = await categoriaIdsDeEntrenador(ctx.entrenadorId);
    if (!cats.includes(jugador.categoriaId)) {
      throw new NotFoundError("Jugador no encontrado.");
    }
  } else if (ctx.rol !== "ESCUELA_ADMIN" && ctx.rol !== "SUPER_ADMIN") {
    throw new ForbiddenError();
  }
  return jugador;
}

export interface ConversacionResumenDTO {
  id: string;
  asunto: string;
  jugadorId: string;
  ultimoMensaje: string | null;
  actualizada: string;
}

export interface MensajeDTO {
  id: string;
  cuerpo: string;
  remitenteNombre: string;
  remitenteRol: string;
  esMio: boolean;
  createdAt: string;
}

export interface ConversacionDetalleDTO {
  id: string;
  asunto: string;
  jugadorId: string;
  mensajes: MensajeDTO[];
}

/** Crea una conversación anclada a un jugador con un primer mensaje. */
export async function crearConversacion(
  ctx: AuthContext,
  jugadorId: string,
  asunto: string,
  cuerpo: string,
): Promise<{ id: string }> {
  requireRole(ctx, ["DT", "ESCUELA_ADMIN", "JUGADOR"]);
  const escuelaId = requireEscuela(ctx);
  await autorizarJugador(ctx, jugadorId);
  const conv = await crearConversacionConMensaje(
    escuelaId,
    jugadorId,
    asunto,
    ctx.userId,
    cuerpo,
  );
  await notificarOtros(ctx, jugadorId, asunto);
  return { id: conv.id };
}

export async function responder(
  ctx: AuthContext,
  conversacionId: string,
  cuerpo: string,
): Promise<void> {
  requireRole(ctx, ["DT", "ESCUELA_ADMIN", "JUGADOR"]);
  const escuelaId = requireEscuela(ctx);
  const conv = await obtenerConversacion(escuelaId, conversacionId);
  if (!conv) throw new NotFoundError("Conversación no encontrada.");
  await autorizarJugador(ctx, conv.jugadorId);
  await agregarMensaje(conversacionId, ctx.userId, cuerpo);
  await notificarOtros(ctx, conv.jugadorId, conv.asunto);
}

/** Notifica a la contraparte (padre o DT) de un nuevo mensaje. */
async function notificarOtros(
  ctx: AuthContext,
  jugadorId: string,
  asunto: string,
): Promise<void> {
  const jugador = await obtenerJugadorParaFoto(jugadorId);
  if (!jugador) return;
  const destinos: string[] = [];
  if (ctx.rol === "JUGADOR") {
    // avisar al DT de la categoría no es trivial sin su userId; se omite en Fase 1
  } else {
    if (jugador.padreUserId) destinos.push(jugador.padreUserId);
    if (jugador.cuentaUserId) destinos.push(jugador.cuentaUserId);
  }
  await notificar(
    destinos.filter((d) => d !== ctx.userId),
    {
      tipo: "MENSAJE",
      titulo: "Nuevo mensaje",
      cuerpo: asunto,
      url: "/jugador/mensajes",
    },
  );
}

export async function listarConversaciones(
  ctx: AuthContext,
): Promise<ConversacionResumenDTO[]> {
  const escuelaId = requireEscuela(ctx);
  let rows;
  if (ctx.rol === "JUGADOR") {
    const hijos = await listarHijos(ctx.userId);
    rows = await listarConversacionesDeJugadores(
      escuelaId,
      hijos.map((h) => h.id),
    );
  } else if (ctx.rol === "DT") {
    if (!ctx.entrenadorId) throw new ForbiddenError();
    const cats = await categoriaIdsDeEntrenador(ctx.entrenadorId);
    const jugadorIds = await jugadorIdsDeCategorias(escuelaId, cats);
    rows = await listarConversacionesDeJugadores(escuelaId, jugadorIds);
  } else if (ctx.rol === "ESCUELA_ADMIN") {
    rows = await listarConversacionesEscuela(escuelaId);
  } else {
    throw new ForbiddenError();
  }
  return rows.map((c) => ({
    id: c.id,
    asunto: c.asunto,
    jugadorId: c.jugadorId,
    ultimoMensaje: c.mensajes[0]?.cuerpo ?? null,
    actualizada: c.updatedAt.toISOString(),
  }));
}

export async function obtenerConversacionDetalle(
  ctx: AuthContext,
  conversacionId: string,
): Promise<ConversacionDetalleDTO> {
  const escuelaId = requireEscuela(ctx);
  const conv = await obtenerConversacion(escuelaId, conversacionId);
  if (!conv) throw new NotFoundError("Conversación no encontrada.");
  await autorizarJugador(ctx, conv.jugadorId);
  await marcarMensajesLeidos(conversacionId, ctx.userId);
  return {
    id: conv.id,
    asunto: conv.asunto,
    jugadorId: conv.jugadorId,
    mensajes: conv.mensajes.map((m) => ({
      id: m.id,
      cuerpo: m.cuerpo,
      remitenteNombre: m.remitente.nombre,
      remitenteRol: m.remitente.rol,
      esMio: m.remitenteId === ctx.userId,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

// --- Anuncios ---

export async function publicarAnuncio(
  ctx: AuthContext,
  data: {
    categoriaId?: string;
    titulo: string;
    cuerpo: string;
    visibleJugador?: boolean;
    fijado?: boolean;
  },
): Promise<void> {
  requireRole(ctx, ["DT", "ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  // El DT solo publica en sus categorías; la escuela puede global o por categoría.
  if (ctx.rol === "DT") {
    if (!ctx.entrenadorId) throw new ForbiddenError();
    const cats = await categoriaIdsDeEntrenador(ctx.entrenadorId);
    if (!data.categoriaId || !cats.includes(data.categoriaId)) {
      throw new ForbiddenError();
    }
  }
  await crearAnuncio(escuelaId, {
    categoriaId: data.categoriaId || null,
    autorRol: ctx.rol,
    titulo: data.titulo,
    cuerpo: data.cuerpo,
    visibleJugador: data.visibleJugador,
    fijado: data.fijado,
  });
}

export interface AnuncioDTO {
  id: string;
  categoriaId: string | null;
  autorRol: string;
  titulo: string;
  cuerpo: string;
  visibleJugador: boolean;
  fijado: boolean;
  createdAt: string;
}

export async function listarAnuncios(ctx: AuthContext): Promise<AnuncioDTO[]> {
  const escuelaId = requireEscuela(ctx);
  let rows;
  if (ctx.rol === "DT") {
    if (!ctx.entrenadorId) throw new ForbiddenError();
    const cats = await categoriaIdsDeEntrenador(ctx.entrenadorId);
    rows = await listarAnunciosParaCategorias(escuelaId, cats);
  } else if (ctx.rol === "ESCUELA_ADMIN") {
    rows = await listarAnunciosEscuela(escuelaId);
  } else {
    throw new ForbiddenError();
  }
  return rows.map((a) => ({
    id: a.id,
    categoriaId: a.categoriaId,
    autorRol: a.autorRol,
    titulo: a.titulo,
    cuerpo: a.cuerpo,
    visibleJugador: a.visibleJugador,
    fijado: a.fijado,
    createdAt: a.createdAt.toISOString(),
  }));
}
