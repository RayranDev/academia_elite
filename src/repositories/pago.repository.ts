import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

// Repositorio de pagos (Capa 4). Firma con escuelaId (multi-tenant).

/**
 * Cuotas de unos jugadores que la familia PUEDE reportar: impagas y sin un pago
 * ya en revisión encima. El índice único parcial de `PagoAplicacion` garantiza
 * que nunca haya dos aplicaciones activas sobre la misma cuota; este filtro es
 * lo que evita que la pantalla la ofrezca dos veces antes de intentarlo.
 */
export function cuotasParaReportar(escuelaId: string, jugadorIds: string[]) {
  if (jugadorIds.length === 0) return Promise.resolve([]);
  return db.membresia.findMany({
    where: {
      escuelaId,
      jugadorId: { in: jugadorIds },
      estado: { not: "PAGADA" },
      aplicaciones: { none: { activa: true } },
    },
    select: {
      id: true,
      jugadorId: true,
      periodo: true,
      conceptoId: true,
      estado: true,
      monto: true,
      descuento: true,
      conceptoCobro: { select: { nombre: true } },
    },
    orderBy: [{ periodo: "asc" }],
  });
}

/**
 * Las mismas membresías, para validar en el servicio lo que el tutor eligió.
 * Trae `aplicaciones` filtradas a las activas: si alguna cuota seleccionada ya
 * tiene una, el servicio la rechaza antes de escribir nada.
 */
export function membresiasParaValidar(escuelaId: string, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return db.membresia.findMany({
    where: { escuelaId, id: { in: ids } },
    select: {
      id: true,
      jugadorId: true,
      periodo: true,
      conceptoId: true,
      estado: true,
      monto: true,
      descuento: true,
      aplicaciones: { where: { activa: true }, select: { pagoId: true } },
    },
  });
}

interface FiltrosPago {
  estado?: string;
  reportadoPor?: string;
}

function condicionesPago(
  escuelaId: string,
  filtros: FiltrosPago,
): Prisma.PagoWhereInput[] {
  const AND: Prisma.PagoWhereInput[] = [{ escuelaId }];
  if (filtros.estado) AND.push({ estado: filtros.estado });
  if (filtros.reportadoPor) AND.push({ reportadoPor: filtros.reportadoPor });
  return AND;
}

/** Incluye lo necesario para armar el DTO completo: medios y a qué cuotas se aplica. */
const pagoConDetalle = {
  medios: true,
  aplicaciones: {
    include: {
      membresia: { select: { id: true, jugadorId: true, periodo: true, conceptoCobro: { select: { nombre: true } } } },
    },
  },
} satisfies Prisma.PagoInclude;

export function listarPagos(
  escuelaId: string,
  filtros: FiltrosPago & { skip?: number; take?: number } = {},
) {
  return db.pago.findMany({
    where: { AND: condicionesPago(escuelaId, filtros) },
    include: pagoConDetalle,
    orderBy: [{ createdAt: "desc" }],
    skip: filtros.skip,
    take: filtros.take,
  });
}

export function contarPagos(escuelaId: string, filtros: FiltrosPago = {}) {
  return db.pago.count({ where: { AND: condicionesPago(escuelaId, filtros) } });
}

/**
 * Crea un pago completo (medios + aplicaciones) en una transacción.
 *
 * El `createMany` de aplicaciones puede chocar contra el índice único parcial
 * `(membresiaId) WHERE activa` si otra pestaña reportó la misma cuota mientras
 * el usuario completaba este formulario; el servicio traduce ese choque (código
 * Prisma P2002) a un mensaje de dominio en vez de dejarlo pasar como error
 * genérico.
 */
export function crearPago(data: {
  escuelaId: string;
  reportadoPor: string;
  origen: string;
  estado: string;
  monto: number;
  fechaPago: Date;
  nota: string | null;
  revisadoPor: string | null;
  revisadoEn: Date | null;
  medios: { medio: string; monto: number; referencia: string | null }[];
  aplicaciones: { membresiaId: string; monto: number }[];
}) {
  return db.$transaction(async (tx) => {
    const pago = await tx.pago.create({
      data: {
        escuelaId: data.escuelaId,
        reportadoPor: data.reportadoPor,
        origen: data.origen,
        estado: data.estado,
        monto: data.monto,
        fechaPago: data.fechaPago,
        nota: data.nota,
        revisadoPor: data.revisadoPor,
        revisadoEn: data.revisadoEn,
      },
    });
    // `create` uno por uno y no `createMany`: quien llama necesita el id de
    // cada `PagoMedio` para colgarle el comprobante después (el nombre del
    // archivo en el bucket se arma con ESE id). `createMany` no devuelve las
    // filas creadas en Postgres, así que con él habría que volver a leer el
    // pago entero solo para conseguir los ids — un viaje a la base de más por
    // algo que ya se tiene acá. Son a lo sumo 4 medios, nunca es un lote grande.
    //
    // SECUENCIAL (`for` + `await`), no `Promise.all`: una transacción
    // interactiva de Prisma corre sobre UNA conexión, y lanzar varias queries
    // en paralelo sobre el mismo `tx` no tiene orden garantizado — es
    // justamente lo que la documentación de Prisma pide evitar.
    const medios: Prisma.PagoMedioGetPayload<Record<string, never>>[] = [];
    for (const m of data.medios) {
      medios.push(await tx.pagoMedio.create({ data: { pagoId: pago.id, ...m } }));
    }
    await tx.pagoAplicacion.createMany({
      data: data.aplicaciones.map((a) => ({ pagoId: pago.id, ...a })),
    });
    // Un pago de origen ESCUELA nace ya APROBADO: las cuotas que cubre se
    // marcan pagadas en la misma transacción que lo crea, no en un segundo paso.
    if (data.estado === "APROBADO") {
      await tx.membresia.updateMany({
        where: {
          escuelaId: data.escuelaId,
          id: { in: data.aplicaciones.map((a) => a.membresiaId) },
        },
        data: { estado: "PAGADA", pagadaEn: data.fechaPago },
      });
    }
    return { ...pago, medios };
  });
}

/**
 * Guarda el nombre del archivo de comprobante ya subido para un medio. Se
 * actualiza DESPUÉS de crear el pago porque el nombre del objeto en el bucket
 * usa el id del `PagoMedio`, que recién existe una vez creado.
 */
export function actualizarComprobante(pagoMedioId: string, comprobanteUrl: string) {
  return db.pagoMedio.update({ where: { id: pagoMedioId }, data: { comprobanteUrl } });
}

export function obtenerPagoMedioParaAcceso(id: string) {
  return db.pagoMedio.findUnique({
    where: { id },
    select: {
      id: true,
      comprobanteUrl: true,
      pago: { select: { id: true, escuelaId: true, reportadoPor: true } },
    },
  });
}

/**
 * Aprueba un pago REPORTADO: pasa a APROBADO y marca PAGADA cada cuota que
 * cubre, con `pagadaEn` = la fecha en que la familia dijo haber pagado (no el
 * momento de la aprobación) — es el mismo criterio que `Egreso.fecha`, y es lo
 * que hace que la caja neta del mes ubique el ingreso donde realmente ocurrió.
 */
export function aprobarPago(escuelaId: string, id: string, revisadoPor: string) {
  return db.$transaction(async (tx) => {
    const pago = await tx.pago.findFirst({
      where: { id, escuelaId, estado: "REPORTADO" },
      include: { aplicaciones: { where: { activa: true } } },
    });
    if (!pago) return null;

    // `updateMany` y no `update`: así el `where` puede llevar `escuelaId`
    // explícito además del id (el test guardián de aislamiento multi-tenant lo
    // exige en cada escritura, no solo en la lectura previa de la transacción).
    await tx.pago.updateMany({
      where: { id, escuelaId },
      data: { estado: "APROBADO", revisadoPor, revisadoEn: new Date() },
    });
    await tx.membresia.updateMany({
      where: { escuelaId, id: { in: pago.aplicaciones.map((a) => a.membresiaId) } },
      data: { estado: "PAGADA", pagadaEn: pago.fechaPago },
    });
    return pago;
  });
}

/** Rechaza un pago REPORTADO: libera las cuotas (quedan de nuevo disponibles). */
export function rechazarPago(
  escuelaId: string,
  id: string,
  revisadoPor: string,
  motivo: string,
) {
  return db.$transaction(async (tx) => {
    const pago = await tx.pago.findFirst({ where: { id, escuelaId, estado: "REPORTADO" } });
    if (!pago) return null;

    await tx.pago.updateMany({
      where: { id, escuelaId },
      data: {
        estado: "RECHAZADO",
        revisadoPor,
        revisadoEn: new Date(),
        motivoRechazo: motivo,
      },
    });
    // `PagoAplicacion` no tiene `escuelaId` propio (cuelga de `Pago`, que ya se
    // acotó arriba); filtrar por `pagoId` de un pago ya verificado del tenant
    // es la forma correcta acá, no un escape del aislamiento.
    await tx.pagoAplicacion.updateMany({
      where: { pagoId: id },
      data: { activa: false },
    });
    return pago;
  });
}

/**
 * Anula un pago APROBADO: las cuotas que cubría vuelven a PENDIENTE. Es la
 * corrección de un pago ya aprobado — un pago aprobado nunca se edita, se
 * anula y se registra de nuevo (AGENTS.md, ver el modelo `Pago`).
 */
export function anularPago(
  escuelaId: string,
  id: string,
  anuladoPor: string,
  motivo: string,
) {
  return db.$transaction(async (tx) => {
    const pago = await tx.pago.findFirst({
      where: { id, escuelaId, estado: "APROBADO" },
      include: { aplicaciones: { where: { activa: true } } },
    });
    if (!pago) return null;

    await tx.pago.updateMany({
      where: { id, escuelaId },
      data: {
        estado: "ANULADO",
        anuladoPor,
        anuladoEn: new Date(),
        motivoAnulacion: motivo,
      },
    });
    // Mismo criterio que en `rechazarPago`: `PagoAplicacion` cuelga de un
    // `Pago` ya verificado del tenant, no tiene `escuelaId` propio.
    await tx.pagoAplicacion.updateMany({
      where: { pagoId: id },
      data: { activa: false },
    });
    await tx.membresia.updateMany({
      where: { escuelaId, id: { in: pago.aplicaciones.map((a) => a.membresiaId) } },
      data: { estado: "PENDIENTE", pagadaEn: null, medioPago: null, referenciaPago: null },
    });
    return pago;
  });
}
