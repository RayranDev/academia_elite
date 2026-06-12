import type { AuthContext } from "@/lib/auth/context";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { categoriasDelDt, requireDtScope } from "@/services/dt-scope";
import { categoriasDeEntrenador } from "@/repositories/entrenador.repository";
import {
  listarPlantilla,
  listarSolicitudes,
  obtenerJugador,
  crearJugador,
  actualizarEstadoJugador,
} from "@/repositories/jugador.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { listarEvaluacionesJugador } from "@/repositories/evaluacion.repository";
import { aPlayerCardData } from "@/lib/mappers/player-card";
import type { JugadorInput } from "@/lib/validators/jugador";
import type { PlayerCardData, Posicion } from "@/types";

export interface PlantillaItemDTO {
  id: string;
  nombre: string;
  apellido: string;
  posicion: Posicion;
  categoriaId: string;
  categoriaNombre: string;
  card: PlayerCardData | null; // null si aún no tiene evaluación
  ultimaEvaluacion: string | null;
  vencida: boolean;
}

export interface SolicitudDTO {
  id: string;
  nombre: string;
  apellido: string;
  categoriaNombre: string;
  padreNombre: string | null;
  padreEmail: string | null;
  fechaNacimiento: string;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Categorías (id + nombre) del DT, para formularios de alta/código. */
export async function listarCategoriasDelDt(
  ctx: AuthContext,
): Promise<{ id: string; nombre: string }[]> {
  const { entrenadorId } = requireDtScope(ctx);
  return categoriasDeEntrenador(entrenadorId);
}

/** Jugadores activos del DT (id, nombre, categoría) para convocatorias. */
export async function listarActivosDt(
  ctx: AuthContext,
): Promise<{ id: string; nombre: string; apellido: string; categoriaId: string }[]> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugadores = await listarPlantilla(escuelaId, categoriaIds);
  return jugadores.map((j) => ({
    id: j.id,
    nombre: j.nombre,
    apellido: j.apellido,
    categoriaId: j.categoriaId,
  }));
}

export async function listarPlantillaDt(
  ctx: AuthContext,
): Promise<PlantillaItemDTO[]> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const [jugadores, escuela] = await Promise.all([
    listarPlantilla(escuelaId, categoriaIds),
    obtenerEscuela(escuelaId),
  ]);
  const frecuencia = escuela?.frecuenciaEvaluacionDias ?? 30;
  const ahora = Date.now();

  return jugadores.map((j) => {
    const stats = j.stats[0] ?? null;
    const vencida =
      !stats || ahora - stats.createdAt.getTime() > frecuencia * DIA_MS;
    return {
      id: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      posicion: j.posicion as Posicion,
      categoriaId: j.categoriaId,
      categoriaNombre: j.categoria.nombre,
      // La foto se sirve por API protegida; en la mini-carta se usa avatar.
      card: stats ? aPlayerCardData(j, stats, null) : null,
      ultimaEvaluacion: stats ? stats.createdAt.toISOString() : null,
      vencida,
    };
  });
}

export async function listarSolicitudesDt(
  ctx: AuthContext,
): Promise<SolicitudDTO[]> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const rows = await listarSolicitudes(escuelaId, categoriaIds);
  return rows.map((j) => ({
    id: j.id,
    nombre: j.nombre,
    apellido: j.apellido,
    categoriaNombre: j.categoria.nombre,
    padreNombre: j.padre?.nombre ?? null,
    padreEmail: j.padre?.email ?? null,
    fechaNacimiento: j.fechaNacimiento.toISOString(),
  }));
}

/** Alta directa de jugador por el DT (queda ACTIVO). */
export async function crearJugadorDt(
  ctx: AuthContext,
  data: JugadorInput,
): Promise<void> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  if (!categoriaIds.includes(data.categoriaId)) {
    throw new ValidationError("Esa categoría no está entre las tuyas.");
  }
  await crearJugador(escuelaId, {
    categoriaId: data.categoriaId,
    nombre: data.nombre,
    apellido: data.apellido,
    fechaNacimiento: data.fechaNacimiento,
    posicion: data.posicion,
    dorsal: data.dorsal ?? null,
    estado: "ACTIVO",
  });
}

async function cambiarEstadoSolicitud(
  ctx: AuthContext,
  jugadorId: string,
  estado: "ACTIVO" | "INACTIVO",
): Promise<void> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugador = await obtenerJugador(escuelaId, jugadorId);
  if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  await actualizarEstadoJugador(escuelaId, jugadorId, estado);
}

export function aprobarSolicitud(ctx: AuthContext, jugadorId: string) {
  return cambiarEstadoSolicitud(ctx, jugadorId, "ACTIVO");
}

export function rechazarSolicitud(ctx: AuthContext, jugadorId: string) {
  return cambiarEstadoSolicitud(ctx, jugadorId, "INACTIVO");
}

export interface DetalleJugadorDTO {
  id: string;
  nombre: string;
  apellido: string;
  posicion: Posicion;
  dorsal: number | null;
  categoriaNombre: string;
  estado: string;
  card: PlayerCardData | null;
  historial: { fecha: string; ovr: number; nivel: string }[];
}

export async function obtenerDetalleJugadorDt(
  ctx: AuthContext,
  jugadorId: string,
): Promise<DetalleJugadorDTO> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugador = await obtenerJugador(escuelaId, jugadorId);
  if (!jugador || !categoriaIds.includes(jugador.categoriaId)) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  const evaluaciones = await listarEvaluacionesJugador(escuelaId, jugadorId);
  const stats = jugador.stats[0] ?? null;

  return {
    id: jugador.id,
    nombre: jugador.nombre,
    apellido: jugador.apellido,
    posicion: jugador.posicion as Posicion,
    dorsal: jugador.dorsal,
    categoriaNombre: jugador.categoria.nombre,
    estado: jugador.estado,
    card: stats ? aPlayerCardData(jugador, stats, null) : null,
    historial: evaluaciones
      .filter((e) => e.statsCalculados)
      .map((e) => ({
        fecha: e.fecha.toISOString(),
        ovr: e.statsCalculados!.ovr,
        nivel: e.statsCalculados!.nivel,
      })),
  };
}
