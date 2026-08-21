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
    // El nombre del concepto viaja con la fila: es lo que muestra la tabla, y
    // resolverlo aparte obligaría a un segundo query por página.
    include: { conceptoCobro: { select: { id: true, nombre: true } } },
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
 * atómico sobre el unique (escuelaId, jugadorId, periodo, conceptoId) — sin
 * condición de carrera.
 */
export function upsertMembresia(
  escuelaId: string,
  jugadorId: string,
  periodo: string,
  conceptoId: string,
  data: { monto: number | null; descuento: number | null; estado: string },
) {
  // Las columnas del pago se derivan del estado, igual que en
  // `registrarPagoMembresia`. Antes esta ruta escribía solo monto/descuento/
  // estado y las dejaba como estaban, con dos consecuencias que la UI mostraba
  // tal cual:
  //   * PAGADA -> PENDIENTE dejaba el comprobante colgado: la fila decía
  //     "Pendiente" y al lado "pagada el 3/8 · Nequi", y el export lo bajaba así
  //     a la planilla que alguien concilia contra el banco.
  //   * PENDIENTE -> PAGADA marcaba el estado sin sellar `pagadaEn`, y la caja
  //     neta suma por `pagadaEn`: ese pago no existía para el reporte.
  //
  // Pero al quedarse PAGADA hay que CONSERVAR lo que ya estaba: este formulario
  // no pide medio ni referencia (los pide el de cambiar estado), así que
  // recalcularlos desde cero al corregir un monto borraba el comprobante y movía
  // el pago al mes de hoy. Por eso lee la fila antes de escribirla, en la misma
  // transacción.
  // El `where` va escrito entero en cada llamada y no extraído a una variable:
  // el test guardián de aislamiento (`tests/unit/aislamiento-tenant.test.ts`)
  // lee el código, y con la clave en una variable no puede ver el `escuelaId`.
  return db.$transaction(async (tx) => {
    const actual = await tx.membresia.findUnique({
      where: {
        escuelaId_jugadorId_periodo_conceptoId: {
          escuelaId,
          jugadorId,
          periodo,
          conceptoId,
        },
      },
    });
    const fila = { ...data, ...pagoConservando(data.estado, actual) };
    return tx.membresia.upsert({
      where: {
        escuelaId_jugadorId_periodo_conceptoId: {
          escuelaId,
          jugadorId,
          periodo,
          conceptoId,
        },
      },
      update: fila,
      create: { escuelaId, jugadorId, periodo, conceptoId, ...fila },
    });
  });
}

/** Registro del pago que ya tenía una cuota (null si es alta). */
interface PagoGuardado {
  pagadaEn: Date | null;
  medioPago: string | null;
  referenciaPago: string | null;
}

/**
 * Columnas del pago para un estado, conservando lo ya registrado.
 *
 * Si sigue PAGADA no se toca nada de lo que había: `pagadaEn` mantiene la fecha
 * REAL del pago (no la de la corrección) y el comprobante sobrevive. Solo se
 * sella `pagadaEn` cuando la cuota pasa a PAGADA sin tenerla.
 *
 * Al salir de PAGADA se limpian las tres: un comprobante colgado de una cuota
 * que ya no está paga no es un dato viejo, es un dato falso.
 */
function pagoConservando(
  estado: string,
  actual: PagoGuardado | null,
): PagoGuardado {
  if (estado !== "PAGADA") {
    return { pagadaEn: null, medioPago: null, referenciaPago: null };
  }
  return {
    pagadaEn: actual?.pagadaEn ?? new Date(),
    medioPago: actual?.medioPago ?? null,
    referenciaPago: actual?.referenciaPago ?? null,
  };
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
      // Acá el medio y la referencia SÍ vienen del formulario, así que se
      // escriben tal cual (a diferencia de `upsertMembresia`, que no los pide).
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
  conceptoId: string,
): Promise<Set<string>> {
  const rows = await db.membresia.findMany({
    where: { escuelaId, periodo, conceptoId },
    select: { jugadorId: true },
  });
  return new Set(rows.map((r) => r.jugadorId));
}

/**
 * Crea de una sola vez las cuotas que faltan, sin tocar las que ya existen.
 *
 * Usa `createMany({ skipDuplicates })` y NO un upsert: un upsert pisaría el monto
 * y el estado de una cuota YA PAGADA. El unique
 * (escuelaId, jugadorId, periodo, conceptoId) hace el filtrado en la base, así que
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
    conceptoId: string;
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
      conceptoId: true,
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
      conceptoId: true,
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
