import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { generarCodigoInvitacion, generarCodigoRef } from "@/lib/codes";

// Repositorio de jugadores (Capa 4). Firma con escuelaId (multi-tenant).

/**
 * La carta vigente del jugador: su último snapshot de stats.
 *
 * "Último" se resuelve por la FECHA DE LA EVALUACIÓN, no por el orden en que
 * se insertó la fila: son dos cosas distintas en cuanto una evaluación se
 * carga fuera de orden, y el historial de la ficha (`listarEvaluacionesDeJugador`)
 * ya ordenaba por `fecha` — con `createdAt` acá, la carta y el historial de la
 * MISMA pantalla podían señalar evaluaciones distintas. `createdAt` queda de
 * desempate para dos evaluaciones con la misma fecha.
 *
 * Y se excluyen las ANULADAS: anular es la única forma de deshacer una
 * evaluación (son inmutables, AGENTS.md), pero el snapshot de stats sobrevive
 * en `StatsCalculados`. Sin este filtro, el historial escondía la evaluación
 * anulada mientras la carta seguía mostrándola — el mismo criterio de "no
 * anuladas" que ya aplican el historial, el perfil del DT y las métricas.
 */
const statsLatest = {
  where: { evaluacion: { anulada: false } },
  orderBy: [
    { evaluacion: { fecha: "desc" as const } },
    { createdAt: "desc" as const },
  ],
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

/**
 * Jugadores ACTIVO de la escuela con su categoría, para generar la cobranza del
 * mes. Solo ACTIVO: a un jugador PENDIENTE (todavía sin aprobar) o INACTIVO no
 * se le emite cuota. `descuentos` trae los ids de las reglas asignadas a mano
 * (Hermano, Beca…) para resolver el descuento de la cuota en memoria.
 */
export function jugadoresActivosParaCobranza(escuelaId: string) {
  return db.jugador.findMany({
    where: { escuelaId, estado: "ACTIVO" },
    select: {
      id: true,
      categoriaId: true,
      descuentos: { select: { reglaId: true } },
    },
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

interface FiltrosJugadoresGestion {
  id?: string;
  categoriaId?: string;
  estados?: string[];
  search?: string;
  bloqueado?: boolean;
}

/**
 * Arma el `AND` de filtros. AND explícito, no un solo objeto `where`: la
 * búsqueda por texto y el filtro por bloqueado usan cada uno su propio `OR`
 * (nombre/apellido/código el primero; padre/cuentaUser el segundo), y dos
 * claves `OR` en un mismo objeto literal se pisarían entre sí.
 */
function condicionesJugadorGestion(
  escuelaId: string,
  filtros: FiltrosJugadoresGestion,
): Prisma.JugadorWhereInput[] {
  const AND: Prisma.JugadorWhereInput[] = [{ escuelaId }];
  if (filtros.id) AND.push({ id: filtros.id });
  if (filtros.categoriaId) AND.push({ categoriaId: filtros.categoriaId });
  if (filtros.estados && filtros.estados.length > 0) {
    AND.push({ estado: { in: filtros.estados } });
  }
  if (filtros.search) {
    AND.push({
      OR: [
        { nombre: { contains: filtros.search } },
        { apellido: { contains: filtros.search } },
        { codigoRef: { contains: filtros.search } },
      ],
    });
  }
  // Bloqueado vive en padre/cuentaUser, no en Jugador: la familia queda
  // bloqueada, no el registro del jugador en sí.
  if (filtros.bloqueado) {
    AND.push({
      OR: [{ padre: { bloqueado: true } }, { cuentaUser: { bloqueado: true } }],
    });
  }
  return AND;
}

/** Jugadores para gestión (Escuela/Súper Admin), con vínculos de familia. */
export function listarJugadoresGestion(
  escuelaId: string,
  filtros: FiltrosJugadoresGestion & { skip?: number; take?: number },
) {
  return db.jugador.findMany({
    where: { AND: condicionesJugadorGestion(escuelaId, filtros) },
    skip: filtros.skip,
    take: filtros.take,
    include: {
      categoria: { select: { id: true, nombre: true } },
      padre: {
        select: { id: true, nombre: true, email: true, telefono: true, bloqueado: true, bloqueoTipo: true },
      },
      cuentaUser: { select: { id: true, email: true, telefono: true, bloqueado: true } },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

export function contarJugadoresGestion(
  escuelaId: string,
  filtros: FiltrosJugadoresGestion,
) {
  return db.jugador.count({
    where: { AND: condicionesJugadorGestion(escuelaId, filtros) },
  });
}

export function obtenerJugadorGestion(escuelaId: string | null, id: string) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.findFirst({
    where: { id, ...scope },
    include: {
      categoria: { select: { id: true, nombre: true } },
      padre: {
        select: { id: true, nombre: true, email: true, telefono: true, bloqueado: true, bloqueoTipo: true },
      },
      cuentaUser: { select: { id: true, email: true, telefono: true, bloqueado: true } },
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

/**
 * Ficha administrativa y médica (datos sensibles, HABEAS-DATA.md). El servicio
 * decide qué persistir según `autorizaDatosSalud` — este repositorio escribe
 * exactamente lo que recibe, sin lógica de consentimiento.
 */
export function actualizarFichaMedica(
  escuelaId: string | null,
  id: string,
  data: {
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    eps: string | null;
    rh: string | null;
    alergias: string | null;
    condicionesMedicas: string | null;
    aptoMedicoVence: Date | null;
    contactoEmergenciaNombre: string | null;
    contactoEmergenciaTelefono: string | null;
    contactoEmergenciaParentesco: string | null;
    autorizaTraslado: boolean;
    autorizaDatosSalud: boolean;
    autorizacionDatosSaludEn: Date | null;
  },
) {
  const scope = escuelaId === null ? {} : { escuelaId };
  return db.jugador.updateMany({ where: { id, ...scope }, data });
}

/** Jugadores ACTIVO con apto médico vencido y consentimiento de salud vigente. */
export function contarAptosMedicosVencidos(escuelaId: string, hoy: Date) {
  return db.jugador.count({
    where: {
      escuelaId,
      estado: "ACTIVO",
      autorizaDatosSalud: true,
      aptoMedicoVence: { lt: hoy },
    },
  });
}

/**
 * Actualiza SOLO la identidad (nombre/apellido) de un jugador VINCULADO al
 * usuario (padre/tutor). La propiedad va en el `where` como defensa en
 * profundidad: aunque el guard fallara, solo toca jugadores del propio usuario.
 * No permite tocar datos deportivos (posición, categoría, dorsal): eso es del DT.
 */
export function actualizarIdentidadJugadorPropio(
  userId: string,
  id: string,
  data: { nombre: string; apellido: string; parentescoAcudiente?: string | null },
) {
  // tenant-global: propiedad por vínculo del usuario (padre/cuenta), no por escuela.
  return db.jugador.updateMany({
    where: { id, OR: [{ padreUserId: userId }, { cuentaUserId: userId }] },
    data,
  });
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
