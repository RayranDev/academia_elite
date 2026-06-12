import { db } from "@/lib/db";

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
  return db.jugador.create({ data: { escuelaId, ...data } });
}

export function actualizarEstadoJugador(
  escuelaId: string,
  id: string,
  estado: string,
) {
  return db.jugador.updateMany({ where: { id, escuelaId }, data: { estado } });
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
  filtros: { categoriaId?: string; estados: string[] },
) {
  return db.jugador.findMany({
    where: {
      escuelaId,
      estado: { in: filtros.estados },
      ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
    },
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

export function obtenerJugadorGestion(id: string) {
  return db.jugador.findUnique({
    where: { id },
    include: {
      categoria: { select: { id: true, nombre: true } },
      padre: {
        select: { id: true, nombre: true, email: true, bloqueado: true, bloqueoTipo: true },
      },
      cuentaUser: { select: { id: true, email: true, bloqueado: true } },
    },
  });
}

export function actualizarJugadorDatos(
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
  return db.jugador.update({ where: { id }, data, select: { id: true } });
}

/** Jugador con todo lo necesario para el hub (carta, logros, objetivos). */
export function obtenerJugadorHub(id: string) {
  return db.jugador.findUnique({
    where: { id },
    include: {
      categoria: { select: { nombre: true } },
      stats: statsLatest,
      logros: { include: { logro: true }, orderBy: { otorgadoEn: "desc" } },
      objetivos: { orderBy: { fechaLimite: "asc" } },
    },
  });
}

/** Datos mínimos para control de acceso a la foto (serving y gestión). */
export function obtenerJugadorParaFoto(id: string) {
  return db.jugador.findUnique({
    where: { id },
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

export function actualizarFotoJugador(id: string, fotoUrl: string) {
  return db.jugador.update({ where: { id }, data: { fotoUrl } });
}

export function actualizarAvatarJugador(id: string, avatarConfig: string) {
  return db.jugador.update({ where: { id }, data: { avatarConfig } });
}

export function actualizarConsentimientoJugador(
  id: string,
  consiente: boolean,
) {
  return db.jugador.update({
    where: { id },
    data: {
      consentimientoFoto: consiente,
      consentimientoFotoFecha: consiente ? new Date() : null,
    },
  });
}
