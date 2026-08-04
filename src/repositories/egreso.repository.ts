import { db } from "@/lib/db";

// Repositorio de egresos de caja (Capa 4). Firma con escuelaId (multi-tenant).

export function crearEgreso(
  escuelaId: string,
  data: {
    concepto: string;
    monto: number;
    fecha: Date;
    descripcion: string | null;
    medioPago: string | null;
    referenciaPago: string | null;
  },
) {
  return db.egreso.create({ data: { escuelaId, ...data } });
}

export function listarEgresos(
  escuelaId: string,
  filtros: { desde?: Date; hasta?: Date; concepto?: string },
) {
  return db.egreso.findMany({
    where: {
      escuelaId,
      fecha:
        filtros.desde || filtros.hasta
          ? { gte: filtros.desde, lt: filtros.hasta }
          : undefined,
      concepto: filtros.concepto,
    },
    orderBy: { fecha: "desc" },
  });
}

/** Scoping por escuelaId en el where: nunca un delete por solo id. */
export function eliminarEgreso(escuelaId: string, id: string) {
  return db.egreso.deleteMany({ where: { id, escuelaId } });
}

export async function sumaEgresosDelPeriodo(
  escuelaId: string,
  desde: Date,
  hasta: Date,
): Promise<number> {
  const resultado = await db.egreso.aggregate({
    _sum: { monto: true },
    where: { escuelaId, fecha: { gte: desde, lt: hasta } },
  });
  return Number(resultado._sum.monto?.toString() ?? "0");
}
