import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

// Repositorio de membresías / cuotas (Capa 4). Firma con escuelaId (multi-tenant).
// El modelo Membresia no tiene relación Prisma a Jugador: los nombres se
// resuelven aparte con obtenerJugadoresMinimos.

/** Filtros comunes a `listarMembresias` y `contarMembresias`. */
interface FiltrosMembresia {
  periodo?: string;
  jugadorId?: string;
  estadoCondicion?: Record<string, unknown>;
}

/**
 * Arma el `AND` de filtros. AND explícito, no spread de objetos:
 * `estadoCondicion` (VENCIDA) puede traer su propio `periodo: { lt: ... }`, y
 * un spread lo pisaría si el usuario también filtra por un `periodo` exacto
 * al mismo tiempo.
 */
function condicionesMembresia(
  escuelaId: string,
  filtros: FiltrosMembresia,
): Prisma.MembresiaWhereInput[] {
  const AND: Prisma.MembresiaWhereInput[] = [{ escuelaId }];
  if (filtros.periodo) AND.push({ periodo: filtros.periodo });
  if (filtros.jugadorId) AND.push({ jugadorId: filtros.jugadorId });
  if (filtros.estadoCondicion) {
    AND.push(filtros.estadoCondicion as Prisma.MembresiaWhereInput);
  }
  return AND;
}

export function listarMembresias(
  escuelaId: string,
  filtros: FiltrosMembresia & { skip?: number; take?: number } = {},
) {
  return db.membresia.findMany({
    where: { AND: condicionesMembresia(escuelaId, filtros) },
    orderBy: [{ periodo: "desc" }],
    skip: filtros.skip,
    take: filtros.take,
  });
}

export function contarMembresias(escuelaId: string, filtros: FiltrosMembresia = {}) {
  return db.membresia.count({
    where: { AND: condicionesMembresia(escuelaId, filtros) },
  });
}

export function obtenerMembresia(escuelaId: string, id: string) {
  return db.membresia.findFirst({ where: { id, escuelaId } });
}

/**
 * Crea o actualiza la cuota de un jugador para un período y concepto. Upsert
 * atómico sobre el unique (escuelaId, jugadorId, periodo, concepto) — sin
 * condición de carrera.
 */
export function upsertMembresia(
  escuelaId: string,
  jugadorId: string,
  periodo: string,
  concepto: string,
  data: { monto: number | null; descuento: number | null; estado: string },
) {
  return db.membresia.upsert({
    where: {
      escuelaId_jugadorId_periodo_concepto: {
        escuelaId,
        jugadorId,
        periodo,
        concepto,
      },
    },
    update: data,
    create: { escuelaId, jugadorId, periodo, concepto, ...data },
  });
}

/**
 * Marca el pago de una cuota. Sella `pagadaEn` solo al pasar a PAGADA; al salir
 * de PAGADA limpia el registro del pago para no dejar un comprobante colgado de
 * una cuota que ya no está paga.
 */
export function registrarPagoMembresia(
  escuelaId: string,
  id: string,
  estado: string,
  pago: { medioPago: string | null; referenciaPago: string | null },
) {
  const pagada = estado === "PAGADA";
  return db.membresia.updateMany({
    where: { id, escuelaId },
    data: {
      estado,
      pagadaEn: pagada ? new Date() : null,
      medioPago: pagada ? pago.medioPago : null,
      referenciaPago: pagada ? pago.referenciaPago : null,
    },
  });
}

/**
 * Ids de los jugadores que YA tienen cuota de ese período y concepto. Sirve para
 * informar con precisión qué se creó y qué no; la garantía de idempotencia sigue
 * viviendo en el unique (`crearMembresiasFaltantes`), no en este chequeo previo.
 */
export async function jugadoresConCuota(
  escuelaId: string,
  periodo: string,
  concepto: string,
): Promise<Set<string>> {
  const rows = await db.membresia.findMany({
    where: { escuelaId, periodo, concepto },
    select: { jugadorId: true },
  });
  return new Set(rows.map((r) => r.jugadorId));
}

/**
 * Crea de una sola vez las cuotas que faltan, sin tocar las que ya existen.
 *
 * Usa `createMany({ skipDuplicates })` y NO un upsert: un upsert pisaría el monto
 * y el estado de una cuota YA PAGADA. El unique
 * (escuelaId, jugadorId, periodo, concepto) hace el filtrado en la base, así que
 * volver a generar el mismo mes es idempotente por construcción — no hay ventana
 * de carrera entre "consultar qué falta" y "crear".
 *
 * Devuelve cuántas filas se crearon realmente.
 */
export async function crearMembresiasFaltantes(
  escuelaId: string,
  filas: {
    jugadorId: string;
    periodo: string;
    concepto: string;
    monto: number | null;
    descuento: number | null;
  }[],
): Promise<number> {
  if (filas.length === 0) return 0;
  const res = await db.membresia.createMany({
    data: filas.map((f) => ({ escuelaId, ...f })),
    skipDuplicates: true,
  });
  return res.count;
}

/** Cantidad de cuotas por estado en la escuela (un solo query, para el dashboard). */
export function contarMembresiasPorEstado(escuelaId: string) {
  return db.membresia.groupBy({
    by: ["estado"],
    where: { escuelaId },
    _count: { _all: true },
  });
}

/**
 * Cuotas PENDIENTE cuyo período ya cerró: son las que están vencidas de hecho
 * aunque nadie las haya marcado (A.3). La comparación es textual porque
 * "AAAA-MM" con mes de dos dígitos ordena igual como texto que como fecha.
 */
export function contarPendientesDeMesesCerrados(escuelaId: string, periodoActual: string) {
  return db.membresia.count({
    where: { escuelaId, estado: "PENDIENTE", periodo: { lt: periodoActual } },
  });
}

/** Cuotas impagas de la escuela con lo justo para calcular la deuda. */
export function cuotasImpagas(escuelaId: string) {
  return db.membresia.findMany({
    where: { escuelaId, estado: { not: "PAGADA" } },
    select: {
      jugadorId: true,
      periodo: true,
      concepto: true,
      estado: true,
      monto: true,
      descuento: true,
    },
  });
}

/**
 * Cuotas impagas de un conjunto acotado de jugadores (una página de la lista, no
 * toda la escuela). Mismo shape que `cuotasImpagas`, para que ambas alimenten
 * `estadoCuenta` sin conversión extra.
 */
export function cuotasImpagasDeJugadores(escuelaId: string, jugadorIds: string[]) {
  if (jugadorIds.length === 0) return Promise.resolve([]);
  return db.membresia.findMany({
    where: { escuelaId, jugadorId: { in: jugadorIds }, estado: { not: "PAGADA" } },
    select: {
      jugadorId: true,
      periodo: true,
      concepto: true,
      estado: true,
      monto: true,
      descuento: true,
    },
  });
}

/** Familias (rol JUGADOR) con el acceso bloqueado en la escuela. */
export function contarFamiliasBloqueadas(escuelaId: string) {
  return db.user.count({
    where: { escuelaId, rol: "JUGADOR", bloqueado: true },
  });
}

/**
 * Suma de ingresos (monto − descuento) de las cuotas PAGADA con `pagadaEn`
 * dentro de `[desde, hasta)`. No es un `aggregate`: Prisma no resta dos
 * columnas Decimal en el agregado, así que se traen las filas y se suma en JS.
 */
export async function sumaIngresosDelPeriodo(
  escuelaId: string,
  desde: Date,
  hasta: Date,
): Promise<number> {
  const filas = await db.membresia.findMany({
    where: { escuelaId, estado: "PAGADA", pagadaEn: { gte: desde, lt: hasta } },
    select: { monto: true, descuento: true },
  });
  return filas.reduce(
    (total, m) =>
      total + Number(m.monto?.toString() ?? "0") - Number(m.descuento?.toString() ?? "0"),
    0,
  );
}
