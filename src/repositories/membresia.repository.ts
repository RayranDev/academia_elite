import { db } from "@/lib/db";

// Repositorio de membresías / cuotas (Capa 4). Firma con escuelaId (multi-tenant).
// El modelo Membresia no tiene relación Prisma a Jugador: los nombres se
// resuelven aparte con obtenerJugadoresMinimos.

export function listarMembresias(escuelaId: string, periodo?: string) {
  return db.membresia.findMany({
    where: { escuelaId, ...(periodo ? { periodo } : {}) },
    orderBy: [{ periodo: "desc" }],
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

/** Familias (rol JUGADOR) con el acceso bloqueado en la escuela. */
export function contarFamiliasBloqueadas(escuelaId: string) {
  return db.user.count({
    where: { escuelaId, rol: "JUGADOR", bloqueado: true },
  });
}
