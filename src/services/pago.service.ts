import { randomUUID } from "node:crypto";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { Prisma } from "@/generated/prisma/client";
import {
  cuotasParaReportar,
  membresiasParaValidar,
  listarPagos,
  contarPagos,
  crearPago,
  actualizarComprobante,
  obtenerPagoMedioParaAcceso,
  aprobarPago as aprobarPagoRepo,
  rechazarPago as rechazarPagoRepo,
  anularPago as anularPagoRepo,
} from "@/repositories/pago.repository";
import { listarHijos, obtenerJugadoresMinimos } from "@/repositories/jugador.repository";
import { netoCuota, estadoEfectivo } from "@/lib/cobranza";
import { detectarTipoImagen, procesarComprobante } from "@/lib/foto/process";
import { guardarFoto } from "@/lib/foto/storage";
import { registrarAuditoria } from "@/services/audit.service";
import type { ReportarPagoInput } from "@/lib/validators/pago";

/** `Decimal` de Prisma nunca sale hacia la UI (AGENTS.md §4). */
function aNumero(valor: { toString(): string } | null): number | null {
  return valor == null ? null : Number(valor.toString());
}

export interface CuotaReportableDTO {
  id: string;
  jugadorId: string;
  jugadorNombre: string;
  periodo: string;
  conceptoNombre: string;
  neto: number;
  /** Estado DERIVADO (A.3): para que la familia vea cuáles ya están vencidas. */
  estado: string;
}

/**
 * Cuotas de los jugadores del tutor que puede elegir para reportar un pago:
 * impagas, sin un pago ya en revisión encima, y CON monto (una cuota sin
 * precio resuelto no tiene neto que reportar — la completa la escuela primero).
 */
export async function cuotasReportables(ctx: AuthContext): Promise<CuotaReportableDTO[]> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) return [];
  const escuelaId = hijos[0].escuelaId;
  const porId = new Map(hijos.map((h) => [h.id, h]));

  const rows = await cuotasParaReportar(escuelaId, hijos.map((h) => h.id));
  const hoy = new Date();
  const items: CuotaReportableDTO[] = [];
  for (const m of rows) {
    const monto = aNumero(m.monto);
    if (monto == null) continue; // sin precio resuelto: no se puede reportar
    const neto = netoCuota({
      periodo: m.periodo,
      conceptoId: m.conceptoId,
      estado: m.estado,
      monto,
      descuento: aNumero(m.descuento),
    });
    // Una beca total da neto 0: no hay nada que reportar (un medio de pago
    // exige monto > 0), y ofrecerla acá solo confunde. La marca como pagada
    // el admin directo, como cualquier cuota que no pasa por este flujo.
    if (neto == null || neto <= 0) continue;
    const j = porId.get(m.jugadorId);
    items.push({
      id: m.id,
      jugadorId: m.jugadorId,
      jugadorNombre: j ? `${j.nombre} ${j.apellido}` : "—",
      periodo: m.periodo,
      conceptoNombre: m.conceptoCobro.nombre,
      neto,
      estado: estadoEfectivo(m.estado, m.periodo, hoy),
    });
  }
  return items;
}

/**
 * Cuotas reportables de UN jugador de la escuela, para que el ESCUELA_ADMIN
 * arme el registro de un pago cobrado en la cancha. Mismo criterio que
 * `cuotasReportables` (impagas, sin pago activo, con precio resuelto), pero sin
 * la restricción de "solo mis hijos": la escuela puede cobrarle a cualquiera de
 * su tenant.
 */
export async function cuotasReportablesJugador(
  ctx: AuthContext,
  jugadorId: string,
): Promise<CuotaReportableDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const jugadores = await obtenerJugadoresMinimos(escuelaId, [jugadorId]);
  const jugador = jugadores[0];
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");

  const rows = await cuotasParaReportar(escuelaId, [jugadorId]);
  const hoy = new Date();
  const items: CuotaReportableDTO[] = [];
  for (const m of rows) {
    const monto = aNumero(m.monto);
    if (monto == null) continue;
    const neto = netoCuota({
      periodo: m.periodo,
      conceptoId: m.conceptoId,
      estado: m.estado,
      monto,
      descuento: aNumero(m.descuento),
    });
    // Mismo motivo que en `cuotasReportables`: una beca total (neto 0) no
    // tiene nada que cobrar.
    if (neto == null || neto <= 0) continue;
    items.push({
      id: m.id,
      jugadorId: m.jugadorId,
      jugadorNombre: `${jugador.nombre} ${jugador.apellido}`,
      periodo: m.periodo,
      conceptoNombre: m.conceptoCobro.nombre,
      neto,
      estado: estadoEfectivo(m.estado, m.periodo, hoy),
    });
  }
  return items;
}

export interface PagoMedioDTO {
  id: string;
  medio: string;
  monto: number;
  referencia: string | null;
  tieneComprobante: boolean;
}

export interface PagoAplicacionDTO {
  membresiaId: string;
  jugadorId: string;
  periodo: string;
  conceptoNombre: string;
  monto: number;
}

export interface PagoDTO {
  id: string;
  origen: string;
  estado: string;
  monto: number;
  fechaPago: string;
  nota: string | null;
  motivoRechazo: string | null;
  motivoAnulacion: string | null;
  createdAt: string;
  medios: PagoMedioDTO[];
  aplicaciones: PagoAplicacionDTO[];
}

function aPagoDTO(p: {
  id: string;
  origen: string;
  estado: string;
  monto: Prisma.Decimal;
  fechaPago: Date;
  nota: string | null;
  motivoRechazo: string | null;
  motivoAnulacion: string | null;
  createdAt: Date;
  medios: { id: string; medio: string; monto: Prisma.Decimal; referencia: string | null; comprobanteUrl: string | null }[];
  aplicaciones: {
    membresiaId: string;
    monto: Prisma.Decimal;
    membresia: { id: string; jugadorId: string; periodo: string; conceptoCobro: { nombre: string } };
  }[];
}): PagoDTO {
  return {
    id: p.id,
    origen: p.origen,
    estado: p.estado,
    monto: aNumero(p.monto) as number,
    fechaPago: p.fechaPago.toISOString(),
    nota: p.nota,
    motivoRechazo: p.motivoRechazo,
    motivoAnulacion: p.motivoAnulacion,
    createdAt: p.createdAt.toISOString(),
    medios: p.medios.map((m) => ({
      id: m.id,
      medio: m.medio,
      monto: aNumero(m.monto) as number,
      referencia: m.referencia,
      tieneComprobante: m.comprobanteUrl != null,
    })),
    aplicaciones: p.aplicaciones.map((a) => ({
      membresiaId: a.membresiaId,
      jugadorId: a.membresia.jugadorId,
      periodo: a.membresia.periodo,
      conceptoNombre: a.membresia.conceptoCobro.nombre,
      monto: aNumero(a.monto) as number,
    })),
  };
}

/** Historial de pagos reportados por el tutor (cualquier estado). */
export async function misPagos(ctx: AuthContext): Promise<PagoDTO[]> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) return [];
  const escuelaId = hijos[0].escuelaId;
  const rows = await listarPagos(escuelaId, { reportadoPor: ctx.userId });
  return rows.map(aPagoDTO);
}

/**
 * Suma de `medios[].monto`, redondeada al centavo. Comparar floats con `===`
 * es frágil (0.1 + 0.2 !== 0.3); el monto ya viene validado con hasta 2
 * decimales, así que redondear a centavos antes de comparar es suficiente.
 */
function sumaRedondeada(valores: number[]): number {
  return Math.round(valores.reduce((acc, v) => acc + v, 0) * 100) / 100;
}

async function subirComprobantes(
  comprobantes: (Buffer | null)[],
): Promise<(string | null)[]> {
  return Promise.all(
    comprobantes.map(async (buf) => {
      if (!buf) return null;
      const tipo = detectarTipoImagen(buf);
      if (!tipo) {
        throw new ValidationError(
          "El comprobante debe ser una imagen (JPEG, PNG o WebP).",
        );
      }
      const procesado = await procesarComprobante(buf);
      const nombre = `${randomUUID()}.webp`;
      await guardarFoto(nombre, procesado);
      return nombre;
    }),
  );
}

/**
 * Valida que las cuotas elegidas puedan reportarse y que la plata cierre.
 * Común a `reportarPago` (FAMILIA) y `registrarPagoEscuela` (ESCUELA): las dos
 * rutas escriben el mismo tipo de fila, solo cambia quién firma y en qué
 * estado nace.
 */
async function validarYResolverCuotas(
  escuelaId: string,
  membresiaIds: string[],
  jugadorIdsPermitidos: Set<string> | null,
  montoTotal: number,
): Promise<{ membresiaId: string; monto: number }[]> {
  const filas = await membresiasParaValidar(escuelaId, membresiaIds);
  if (filas.length !== membresiaIds.length) {
    throw new NotFoundError("Alguna cuota no existe.");
  }

  const aplicaciones: { membresiaId: string; monto: number }[] = [];
  for (const m of filas) {
    if (jugadorIdsPermitidos && !jugadorIdsPermitidos.has(m.jugadorId)) {
      throw new NotFoundError("Alguna cuota no te pertenece.");
    }
    if (m.estado === "PAGADA") {
      throw new ValidationError("Una de las cuotas ya está pagada.");
    }
    if (m.aplicaciones.length > 0) {
      throw new ValidationError(
        "Una de las cuotas ya tiene un pago en revisión.",
      );
    }
    const neto = netoCuota({
      periodo: m.periodo,
      conceptoId: m.conceptoId,
      estado: m.estado,
      monto: aNumero(m.monto),
      descuento: aNumero(m.descuento),
    });
    if (neto == null) {
      throw new ValidationError(
        "Una de las cuotas todavía no tiene precio cargado.",
      );
    }
    aplicaciones.push({ membresiaId: m.id, monto: neto });
  }

  // El primer corte no habilita abonos parciales ni anticipos: lo reportado
  // tiene que cubrir EXACTO las cuotas elegidas, ni más ni menos.
  const sumaAplicaciones = sumaRedondeada(aplicaciones.map((a) => a.monto));
  if (sumaRedondeada([montoTotal]) !== sumaAplicaciones) {
    throw new ValidationError(
      `El total reportado (${montoTotal}) no coincide con lo que suman las cuotas elegidas (${sumaAplicaciones}).`,
    );
  }
  return aplicaciones;
}

/** Traduce el choque contra el índice único parcial en un mensaje de dominio. */
function esConflictoDeAplicacionActiva(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    String(e.meta?.target ?? "").includes("membresiaId")
  );
}

/**
 * Reporta un pago (autogestión del tutor). Nace REPORTADO: queda pendiente de
 * que la escuela lo valide. Las cuotas que cubre NO cambian de estado todavía
 * — seguirían en mora si ya lo estaban — para que reportar no alcance por sí
 * solo para destrabar el acceso.
 */
export async function reportarPago(
  ctx: AuthContext,
  input: ReportarPagoInput,
  comprobantes: (Buffer | null)[],
): Promise<void> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) throw new NotFoundError("No hay jugadores vinculados a tu cuenta.");
  const escuelaId = hijos[0].escuelaId;
  const jugadorIds = new Set(hijos.map((h) => h.id));

  const montoTotal = sumaRedondeada(input.medios.map((m) => m.monto));
  const aplicaciones = await validarYResolverCuotas(
    escuelaId,
    input.membresiaIds,
    jugadorIds,
    montoTotal,
  );

  const nombresComprobantes = await subirComprobantes(comprobantes);

  let pago: Awaited<ReturnType<typeof crearPago>>;
  try {
    pago = await crearPago({
      escuelaId,
      reportadoPor: ctx.userId,
      origen: "FAMILIA",
      estado: "REPORTADO",
      monto: montoTotal,
      fechaPago: input.fechaPago,
      nota: input.nota,
      revisadoPor: null,
      revisadoEn: null,
      medios: input.medios.map((m) => ({
        medio: m.medio,
        monto: m.monto,
        referencia: m.referencia,
      })),
      aplicaciones,
    });
  } catch (e) {
    if (esConflictoDeAplicacionActiva(e)) {
      throw new ValidationError(
        "Una de las cuotas elegidas ya tiene un pago en revisión (puede que la reportaras dos veces).",
      );
    }
    throw e;
  }

  // Los comprobantes se cuelgan del PagoMedio DESPUÉS de crear el pago: el
  // nombre del objeto en el bucket se arma antes de subir, así que ya podían
  // subirse antes — pero atarlos a la fila SÍ necesita que la fila exista.
  // `pago.medios` viene en el mismo orden que `input.medios` (crearPago los
  // crea uno por uno en ese orden), que es el orden en que se armó
  // `nombresComprobantes`: no hace falta releer el pago para emparejarlos.
  await Promise.all(
    pago.medios.map((m, i) =>
      nombresComprobantes[i] ? actualizarComprobante(m.id, nombresComprobantes[i]!) : null,
    ),
  );

  await registrarAuditoria(ctx, {
    accion: "PAGO_REPORTAR",
    entidad: "Pago",
    entidadId: pago.id,
    escuelaId,
    motivo: `${aplicaciones.length} cuota(s), $${montoTotal}`,
  });
}

/**
 * Registra un pago YA APROBADO, para el efectivo que la escuela cobra en la
 * cancha. El admin ES el validador: mandarlo a su propia bandeja de revisión
 * sería pedirle que se apruebe a sí mismo.
 */
export async function registrarPagoEscuela(
  ctx: AuthContext,
  input: ReportarPagoInput,
  comprobantes: (Buffer | null)[],
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const montoTotal = sumaRedondeada(input.medios.map((m) => m.monto));
  const aplicaciones = await validarYResolverCuotas(
    escuelaId,
    input.membresiaIds,
    null, // la escuela puede cobrarle a cualquier jugador de su tenant
    montoTotal,
  );

  const nombresComprobantes = await subirComprobantes(comprobantes);

  let pago: Awaited<ReturnType<typeof crearPago>>;
  try {
    pago = await crearPago({
      escuelaId,
      reportadoPor: ctx.userId,
      origen: "ESCUELA",
      estado: "APROBADO",
      monto: montoTotal,
      fechaPago: input.fechaPago,
      nota: input.nota,
      revisadoPor: ctx.userId,
      revisadoEn: new Date(),
      medios: input.medios.map((m) => ({
        medio: m.medio,
        monto: m.monto,
        referencia: m.referencia,
      })),
      aplicaciones,
    });
  } catch (e) {
    if (esConflictoDeAplicacionActiva(e)) {
      throw new ValidationError("Una de las cuotas elegidas ya tiene un pago en revisión.");
    }
    throw e;
  }

  await Promise.all(
    pago.medios.map((m, i) =>
      nombresComprobantes[i] ? actualizarComprobante(m.id, nombresComprobantes[i]!) : null,
    ),
  );

  await registrarAuditoria(ctx, {
    accion: "PAGO_REGISTRAR_ESCUELA",
    entidad: "Pago",
    entidadId: pago.id,
    escuelaId,
    motivo: `${aplicaciones.length} cuota(s), $${montoTotal}`,
  });
}

export interface PaginatedPagosDTO {
  items: PagoDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Bandeja de pagos de la escuela, filtrable por estado. */
export async function listarPagosEscuela(
  ctx: AuthContext,
  filtros: { estado?: string; page?: number; limit?: number } = {},
): Promise<PaginatedPagosDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const page = Math.max(1, filtros.page ?? 1);
  const limit = Math.max(1, filtros.limit ?? 20);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    listarPagos(escuelaId, { estado: filtros.estado, skip, take: limit }),
    contarPagos(escuelaId, { estado: filtros.estado }),
  ]);
  return {
    items: rows.map(aPagoDTO),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Aprueba un pago REPORTADO. Auditado. */
export async function aprobarPagoEscuela(ctx: AuthContext, pagoId: string): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const pago = await aprobarPagoRepo(escuelaId, pagoId, ctx.userId);
  if (!pago) throw new NotFoundError("Pago no encontrado o ya revisado.");
  await registrarAuditoria(ctx, {
    accion: "PAGO_APROBAR",
    entidad: "Pago",
    entidadId: pagoId,
    escuelaId,
  });
}

/** Rechaza un pago REPORTADO: libera las cuotas para que se puedan reportar de nuevo. Auditado. */
export async function rechazarPagoEscuela(
  ctx: AuthContext,
  pagoId: string,
  motivo: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const pago = await rechazarPagoRepo(escuelaId, pagoId, ctx.userId, motivo);
  if (!pago) throw new NotFoundError("Pago no encontrado o ya revisado.");
  await registrarAuditoria(ctx, {
    accion: "PAGO_RECHAZAR",
    entidad: "Pago",
    entidadId: pagoId,
    escuelaId,
    motivo,
  });
}

/**
 * Anula un pago APROBADO: sus cuotas vuelven a PENDIENTE. Es la corrección de
 * un pago ya aprobado — nunca se edita, se anula y se registra de nuevo.
 * Auditado.
 */
export async function anularPagoEscuela(
  ctx: AuthContext,
  pagoId: string,
  motivo: string,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const pago = await anularPagoRepo(escuelaId, pagoId, ctx.userId, motivo);
  if (!pago) throw new NotFoundError("Pago no encontrado o no está aprobado.");
  await registrarAuditoria(ctx, {
    accion: "PAGO_ANULAR",
    entidad: "Pago",
    entidadId: pagoId,
    escuelaId,
    motivo,
  });
}

/**
 * Resuelve si `ctx` puede leer el comprobante de un `PagoMedio`: el tutor que
 * reportó el pago, o el ESCUELA_ADMIN del tenant. Usado por la ruta que sirve
 * el archivo — nunca es un estático público (AGENTS.md §5).
 */
export async function puedeVerComprobante(
  ctx: AuthContext,
  pagoMedioId: string,
): Promise<{ comprobanteUrl: string } | null> {
  const medio = await obtenerPagoMedioParaAcceso(pagoMedioId);
  if (!medio || !medio.comprobanteUrl) return null;

  const esDueno = ctx.userId === medio.pago.reportadoPor;
  const esAdminDelTenant =
    ctx.rol === "ESCUELA_ADMIN" && ctx.escuelaId === medio.pago.escuelaId;
  if (!esDueno && !esAdminDelTenant) return null;

  return { comprobanteUrl: medio.comprobanteUrl };
}
