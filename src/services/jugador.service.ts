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
import { cuotasImpagasDeJugadores } from "@/repositories/membresia.repository";
import { aPlayerCardData } from "@/lib/mappers/player-card";
import { evaluacionVencida } from "@/lib/evaluacion";
import { estadoCuenta, type CuotaParaDeuda } from "@/lib/cobranza";
import type { JugadorInput } from "@/lib/validators/jugador";
import type { PlayerCardData, Posicion } from "@/types";

/**
 * Solo SI hay deuda, nunca la cifra: es la frontera de acceso que el DT tiene a
 * cobranza (decisión de producto — ver DECISIONES.md). `enMora` no depende del
 * monto (una cuota vencida sin monto ya cuenta como mora), así que no hace
 * falta convertir el `Decimal` de Prisma para esto.
 */
async function estaEnMora(escuelaId: string, jugadorId: string): Promise<boolean> {
  const impagas = await cuotasImpagasDeJugadores(escuelaId, [jugadorId]);
  const cuotas: CuotaParaDeuda[] = impagas.map((c) => ({
    periodo: c.periodo,
    concepto: c.concepto,
    estado: c.estado,
    monto: null,
    descuento: null,
  }));
  return estadoCuenta(cuotas, new Date()).enMora;
}

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
  tieneFoto: boolean;
  consentimiento: boolean;
}

/**
 * URL de la foto para la carta, SOLO si el responsable dio consentimiento (la
 * API `/api/archivos/foto` igual reautoriza al staff con consentimiento). Sin
 * consentimiento devuelve null → la carta usa el avatar. `?v=` es cache-buster.
 */
function fotoCartaUrl(j: {
  id: string;
  fotoUrl: string | null;
  consentimientoFoto: boolean;
}): string | null {
  return j.consentimientoFoto && j.fotoUrl
    ? `/api/archivos/foto/${j.id}?v=${encodeURIComponent(j.fotoUrl)}`
    : null;
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
    const vencida = !stats || evaluacionVencida(stats.createdAt, frecuencia, ahora);
    return {
      id: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      posicion: j.posicion as Posicion,
      categoriaId: j.categoriaId,
      categoriaNombre: j.categoria.nombre,
      // Foto real si hay consentimiento; si no, avatar (fotoCartaUrl → null).
      card: stats ? aPlayerCardData(j, stats, fotoCartaUrl(j)) : null,
      ultimaEvaluacion: stats ? stats.createdAt.toISOString() : null,
      vencida,
      tieneFoto: !!j.fotoUrl,
      consentimiento: j.consentimientoFoto,
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
  /** Solo si hay cuotas vencidas; nunca el monto (frontera de acceso del DT a cobranza). */
  enMora: boolean;
  /**
   * Subconjunto de la ficha médica que el DT necesita en cancha: contacto de
   * emergencia y alergias/apto médico, nunca documento ni EPS (frontera de
   * acceso del DT — HABEAS-DATA.md). Alergias y apto médico son datos de
   * salud: solo viajan si `autorizaDatosSalud` está activo. El contacto de
   * emergencia no es dato de salud, así que no depende de ese consentimiento.
   */
  fichaEmergencia: {
    contactoEmergenciaNombre: string | null;
    contactoEmergenciaTelefono: string | null;
    contactoEmergenciaParentesco: string | null;
    autorizaTraslado: boolean;
    alergias: string | null;
    aptoMedicoVence: string | null;
  };
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
  const [evaluaciones, enMora] = await Promise.all([
    listarEvaluacionesJugador(escuelaId, jugadorId),
    estaEnMora(escuelaId, jugadorId),
  ]);
  const stats = jugador.stats[0] ?? null;

  return {
    id: jugador.id,
    nombre: jugador.nombre,
    apellido: jugador.apellido,
    posicion: jugador.posicion as Posicion,
    dorsal: jugador.dorsal,
    categoriaNombre: jugador.categoria.nombre,
    estado: jugador.estado,
    card: stats ? aPlayerCardData(jugador, stats, fotoCartaUrl(jugador)) : null,
    historial: evaluaciones
      .filter((e) => e.statsCalculados)
      .map((e) => ({
        fecha: e.fecha.toISOString(),
        ovr: e.statsCalculados!.ovr,
        nivel: e.statsCalculados!.nivel,
      })),
    enMora,
    fichaEmergencia: {
      contactoEmergenciaNombre: jugador.contactoEmergenciaNombre,
      contactoEmergenciaTelefono: jugador.contactoEmergenciaTelefono,
      contactoEmergenciaParentesco: jugador.contactoEmergenciaParentesco,
      autorizaTraslado: jugador.autorizaTraslado,
      alergias: jugador.autorizaDatosSalud ? jugador.alergias : null,
      aptoMedicoVence: jugador.autorizaDatosSalud
        ? (jugador.aptoMedicoVence?.toISOString() ?? null)
        : null,
    },
  };
}
