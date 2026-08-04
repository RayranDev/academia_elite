import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  crearEgreso,
  listarEgresos,
  eliminarEgreso as eliminarEgresoRepo,
  sumaEgresosDelPeriodo,
} from "@/repositories/egreso.repository";
import { sumaIngresosDelPeriodo } from "@/repositories/membresia.repository";
import { periodoDe } from "@/lib/cobranza";
import { registrarAuditoria } from "@/services/audit.service";
import type { EgresoInput } from "@/lib/validators/egreso";

export interface EgresoDTO {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  descripcion: string | null;
  medioPago: string | null;
  referenciaPago: string | null;
  createdAt: string;
}

/**
 * `Decimal` de Prisma nunca sale hacia la UI (AGENTS.md §4: DTOs planos). A
 * diferencia de `Membresia.monto`, acá el monto nunca es null, así que no hace
 * falta el `| null` que sí tiene el `aNumero` de `membresia.service.ts`.
 */
function aNumero(valor: { toString(): string }): number {
  return Number(valor.toString());
}

/** Registra un gasto de caja. El servicio recibe el input ya validado por la action. */
export async function registrarEgreso(
  ctx: AuthContext,
  data: EgresoInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const creado = await crearEgreso(escuelaId, {
    concepto: data.concepto,
    monto: data.monto,
    fecha: data.fecha,
    descripcion: data.descripcion,
    medioPago: data.medioPago,
    referenciaPago: data.referenciaPago,
  });
  await registrarAuditoria(ctx, {
    accion: "EGRESO_REGISTRAR",
    entidad: "Egreso",
    entidadId: creado.id,
    escuelaId,
  });
}

export async function eliminarEgreso(ctx: AuthContext, id: string): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const { count } = await eliminarEgresoRepo(escuelaId, id);
  if (count === 0) throw new NotFoundError("Egreso no encontrado.");
  await registrarAuditoria(ctx, {
    accion: "EGRESO_ELIMINAR",
    entidad: "Egreso",
    entidadId: id,
    escuelaId,
  });
}

export async function listarEgresosEscuela(
  ctx: AuthContext,
  filtros: { desde?: Date; hasta?: Date; concepto?: string },
): Promise<EgresoDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const rows = await listarEgresos(escuelaId, filtros);
  return rows.map((e) => ({
    id: e.id,
    concepto: e.concepto,
    monto: aNumero(e.monto),
    fecha: e.fecha.toISOString(),
    descripcion: e.descripcion,
    medioPago: e.medioPago,
    referenciaPago: e.referenciaPago,
    createdAt: e.createdAt.toISOString(),
  }));
}

export interface ResumenCajaDTO {
  ingresos: number;
  egresos: number;
  neto: number;
}

/** Primer día del mes siguiente al de `desde`, cuidando el corte diciembre→enero. */
export function primerDiaMesSiguiente(desde: Date): Date {
  const anio = desde.getUTCFullYear();
  const mes = desde.getUTCMonth();
  return new Date(Date.UTC(mes === 11 ? anio + 1 : anio, (mes + 1) % 12, 1));
}

/** Resumen de caja de un período AAAA-MM (por defecto, el mes en curso). */
export async function resumenCaja(
  ctx: AuthContext,
  periodo?: string,
): Promise<ResumenCajaDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const periodoResuelto = periodo ?? periodoDe(new Date());
  const desde = new Date(`${periodoResuelto}-01T00:00:00.000Z`);
  const hasta = primerDiaMesSiguiente(desde);

  const [egresos, ingresos] = await Promise.all([
    sumaEgresosDelPeriodo(escuelaId, desde, hasta),
    sumaIngresosDelPeriodo(escuelaId, desde, hasta),
  ]);

  return { ingresos, egresos, neto: ingresos - egresos };
}
