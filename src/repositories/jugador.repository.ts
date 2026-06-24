import { db } from "@/lib/db";
import { generarCodigoInvitacion, generarCodigoRef } from "@/lib/codes";

// Repositorio de jugadores (Capa 4). Firma con escuelaId (multi-tenant).

const statsLatest = {
  orderBy: { createdAt: "desc" as const },
  take: 1,
};

/** Plantilla: jugadores ACTIVO de las categorías indicadas, con su última carta. */
export function listarPlantilla(escuelaId: string, categoriaIds: string[]) {
  return db.jugador.findMany({
    where: { escuelaId, categoriaId: { in: categoriaIds }, estado: "ACTIVO" },
    include: {
      categoria: { select: { id: true, nombre: true } },
      stats: statsLatest,
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

/** Solicitudes pendientes de aprobación en las categorías del DT. */
export function listarSolicitudes(escuelaId: string, categoriaIds: string[]) {
  return db.jugador.findMany({
    where: { escuelaId, categoriaId: { in: categoriaIds }, estado: "PENDIENTE" },
    include: {
      categoria: { select: { id: true, nombre: true } },
      padre: { select: { nombre: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function obtenerJugador(escuelaId: string, id: string) {
  return db.jugador.findFirst({
    where: { id, escuelaId },
    include: {
      categoria: { select: { id: true, nombre: true } },
      stats: statsLatest,
    },
  });
}

export function crearJugador(
  escuelaId: string,
  data: {
    categoriaId: string;
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    posicion: string;
    dorsal?: number | null;
    estado: string;
  },
) {
  // Cada jugador nace con su código de vinculación (codigoJugador) y su código
  // humano de referencia para soporte (codigoRef).
  return db.jugador.create({
    data: {
      escuelaId,
      codigoJugador: generarCodigoInvitacion(),
      codigoRef: generarCodigoRef("JUG"),
      ...data,
    },
  });
}

export function actualizarEstadoJugador(
  escuelaId: string,
  id: string,
  estado: string,
) {
  return db.jugador.updateMany({ where: { id, escuelaId }, data: { estado } });
}

/** Busca un jugador por su código dentro de una escuela (para vincular padre). */
export function obtenerJugadorPorCodigo(escuelaId: string, codigoJugador: string) {
  return db.jugador.findFirst({
    where: { escuelaId, codigoJugador, estado: { not: "ELIMINADO" } },
  });
}

export function vincularPadre(jugadorId: string, padreUserId: string) {
  // tenant-global: vinculación por id de jugador (flujo de registro); sin call sites actuales
  return db.jugador.update({ where: { id: jugadorId }, data: { padreUserId } });
}

/** Datos mínimos de los jugadores de una escuela para detectar duplicados. */
export function jugadoresParaDuplicados(escuelaId: string) {
  return db.jugador.findMany({
    where: { escuelaId, estado: { not: "ELIMINADO" } },
    select: { nombre: true, apellido: true, fechaNacimiento: true },
  });
}

/** Ids de jugadores de unas categorías (para acotar consultas del DT). */
export async function jugadorIdsDeCategorias(
  escuelaId: string,
  categoriaIds: string[],
): Promise<string[]> {
  const rows = await db.jugador.findMany({
    where: { escuelaId, categoriaId: { in: categoriaIds } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Datos mínimos de varios jugadores (para etiquetar conversaciones). */
// --- Curva de desarrollo (cron diario de MEN) ---

/** IDs y escuela de todos los jugadores ACTIVO (para el cron de MEN). */
export function idsJugadoresActivos() {
  // tenant-global: cron diario de MEN; lista jugadores ACTIVO de todas las escuelas
  return db.jugador.findMany({
    where: { estado: "ACTIVO" },
    select: { id: true, escuelaId: true },
  });
}

/** Persiste el bonus de MEN calculado por la curva de desarrollo. */
export function actualizarMenBonus(jugadorId: string, menBonus: number, ahora: Date) {
  // tenant-global: cron diario de MEN; escribe por id de jugador (cross-tenant)
  return db.jugador.update({
    where: { id: jugadorId },
    data: { menBonus, menBonusActualizado: ahora },
  });
}

/**
 * Última StatsCalculados de cada jugador indicado (para reportes de toda la
 * escuela, incluidos INACTIVO/PENDIENTE que no aparecen en listarPlantilla).
 */
export function ultimasStatsPorJugadores(escuelaId: string, jugadorIds: string[]) {
  if (jugadorIds.length === 0) {
    return Promise.resolve(
      [] as { jugadorId: string; ovr: number; nivel: string; createdAt: Date }[],
    );
  }
  return db.statsCalculados.findMany({
    where: { escuelaId, jugadorId: { in: jugadorIds } },
    orderBy: { createdAt: "desc" },
    select: { jugadorId: true, ovr: true, nivel: true, createdAt: true },
  });
}

export function obtenerJugadoresMinimos(escuelaId: string, ids: string[]) {
  return db.jugador.findMany({
    where: { escuelaId, id: { in: ids } },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      categoriaId: true,
      categoria: { select: { nombre: true } },
    },
  });
}

/** Hijos/cuenta vinculados a un usuario JUGADOR (padre/tutor). */
export function listarHijos(userId: string) {
  // tenant-global: lookup por propiedad del usuario (padre/cuenta), no por escuela
  return db.jugador.findMany({
    where: {
      OR: [{ padreUserId: userId }, { cuentaUserId: userId }],
      estado: { not: "ELIMINADO" },
    },
    include: {
      categoria: { select: { nombre: true } },
      stats: statsLatest,
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Jugadores para gestión (Escuela/Súper Admin), con vínculos de familia. */
export function listarJugadoresGestion(
  escuelaId: string,
  filtros: {
    categoriaId?: string;
    estados?: string[];
    search?: string;
    skip?: number;
    take?: number;
  },
) {
  const condEstados = filtros.estados && filtros.estados.length > 0 ? { in: filtros.estados } : undefined;
  const condCategoria = filtros.categoriaId || undefined;
  const condSearch = filtros.search ? [
    { nombre: { contains: filtros.search } },
    { apellido: { contains: filtros.search } },
    { codigoRef: { contains: filtros.search } },
  ] : undefined;

  return db.jugador.findMany({
    where: {
      escuelaId,
      estado: condEstados,
      categoriaId: condCategoria,
      OR: condSearch,
    },
    skip: filtros.skip,
    take: filtros.take,
    include: {
      categoria: { select: { id: true, nombre: true } },
      padre: {
        select: { id: true, nombre: true, email: true, bloqueado: true, bloqueoTipo: true },
      },
      cuentaUser: { select: { id: true, email: true, bloqueado: true } },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

export function contarJugadoresGestion(
  escuelaId: string,
  filtros: {
    categoriaId?: string;
    estados?: string[];
    search?: string;
  },
) {
  const condEstados = filtros.estados && filtros.estados.length > 0 ? { in: filtros.estados } : undefined;
  const condCategoria = filtros.categoriaId || undefined;
  const condSearch = filtros.search ? [
    { nombre: { contains: filtros.search } },
    { apellido: { contains: filtros.search } },
    { codigoRef: { contains: filtros.search } },
  ] : undefined;

  return db.jugador.count({
    where: {
      escuelaId,
      estado: condEstados,
      categoriaId: condCategoria,
      OR: condSearch,
    },
  });
}

export function obtenerJugadorGestion(escuelaId: string | null, id: string) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.findFirst({
    where: { id, ...scope },
    include: {
      categoria: { select: { id: true, nombre: true } },
      padre: {
        select: { id: true, nombre: true, email: true, bloqueado: true, bloqueoTipo: true },
      },
      cuentaUser: { select: { id: true, email: true, bloqueado: true } },
    },
  });
}

export async function actualizarJugadorDatos(
  escuelaId: string | null,
  id: string,
  data: {
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    posicion: string;
    dorsal: number | null;
    categoriaId: string;
  },
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({ where: { id, ...scope }, data });
}

/** Jugador con todo lo necesario para el hub (carta, logros, objetivos). */
export function obtenerJugadorHub(escuelaId: string | null, id: string) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.findFirst({
    where: { id, ...scope },
    include: {
      categoria: { select: { nombre: true } },
      stats: statsLatest,
      logros: { include: { logro: true }, orderBy: { otorgadoEn: "desc" } },
      objetivos: { orderBy: { fechaLimite: "asc" } },
    },
  });
}

/** Datos mínimos para control de acceso a la foto (serving y gestión). */
export function obtenerJugadorParaFoto(escuelaId: string | null, id: string) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.findFirst({
    where: { id, ...scope },
    select: {
      id: true,
      escuelaId: true,
      categoriaId: true,
      padreUserId: true,
      cuentaUserId: true,
      fotoUrl: true,
      consentimientoFoto: true,
    },
  });
}

export async function actualizarFotoJugador(
  escuelaId: string | null,
  id: string,
  fotoUrl: string,
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({ where: { id, ...scope }, data: { fotoUrl } });
}

export async function actualizarAvatarJugador(
  escuelaId: string | null,
  id: string,
  avatarConfig: string,
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({ where: { id, ...scope }, data: { avatarConfig } });
}

export async function actualizarConsentimientoJugador(
  escuelaId: string | null,
  id: string,
  consiente: boolean,
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({
    where: { id, ...scope },
    data: {
      consentimientoFoto: consiente,
      consentimientoFotoFecha: consiente ? new Date() : null,
    },
  });
}
