import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, assertTenant } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  listarMembresias,
  obtenerMembresia,
  upsertMembresia,
  registrarPagoMembresia,
  crearMembresiasFaltantes,
  jugadoresConCuota,
  contarMembresiasPorEstado,
  contarFamiliasBloqueadas,
} from "@/repositories/membresia.repository";
import {
  obtenerJugador,
  obtenerJugadoresMinimos,
  jugadoresActivosParaCobranza,
} from "@/repositories/jugador.repository";
import { listarArancelesActivos } from "@/repositories/arancel.repository";
import { resolverArancel, referenciaDePrecio } from "@/lib/aranceles";
import { registrarAuditoria } from "@/services/audit.service";
import type {
  MembresiaInput,
  CambiarEstadoMembresiaInput,
} from "@/lib/validators/membresia";

export interface MembresiaDTO {
  id: string;
  jugadorId: string;
  jugadorNombre: string;
  categoriaNombre: string;
  periodo: string;
  concepto: string;
  monto: number | null;
  descuento: number | null;
  estado: string;
  pagadaEn: string | null;
  medioPago: string | null;
  referenciaPago: string | null;
}

/**
 * `Decimal` de Prisma nunca sale hacia la UI (AGENTS.md §4: DTOs planos). No se
 * usa `?? null` sobre el valor convertido porque un monto de 0 es legítimo y
 * `0` es falsy: la ausencia se decide sobre el valor original.
 */
function aNumero(valor: { toString(): string } | null): number | null {
  return valor == null ? null : Number(valor.toString());
}

/** Contadores de cobranza para el dashboard de la escuela. */
export interface ResumenMembresiasDTO {
  alDia: number;
  pendientes: number;
  vencidas: number;
  bloqueados: number;
}

/**
 * Resumen de administración (PLAN-UX-DT PR-2 · C2.3). El dashboard de la escuela
 * era 100% deportivo: el dueño no veía la cobranza, que es lo que le paga las
 * cuentas. Un solo groupBy + un count.
 */
export async function resumenMembresias(
  ctx: AuthContext,
): Promise<ResumenMembresiasDTO> {
  // Solo la escuela: el SUPER_ADMIN no tiene acceso ambiental al tenant (§5) y
  // los servicios hermanos de este archivo usan el mismo alcance.
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const [porEstado, bloqueados] = await Promise.all([
    contarMembresiasPorEstado(escuelaId),
    contarFamiliasBloqueadas(escuelaId),
  ]);

  const de = (estado: string) =>
    porEstado.find((p) => p.estado === estado)?._count._all ?? 0;

  return {
    alDia: de("PAGADA"),
    pendientes: de("PENDIENTE"),
    vencidas: de("VENCIDA"),
    bloqueados,
  };
}

/** Resultado de generar la cobranza de un período. */
export interface GeneracionCuotasDTO {
  creadas: number;
  yaExistian: number;
  sinPrecio: number;
}

/**
 * Genera las cuotas de un período para todos los jugadores ACTIVO (Track A · A.2).
 *
 * Es el reemplazo de cargar la cobranza jugador por jugador: una escuela de 150
 * chicos son 150 altas manuales por mes, y nadie sostiene eso dos meses seguidos.
 *
 * Idempotente: se puede correr varias veces sobre el mismo período. Las cuotas
 * que ya existen NO se tocan — ni el monto ni el estado —, así que volver a
 * generar después de haber cobrado no pisa ningún pago.
 *
 * Los jugadores cuya categoría no tiene precio vigente igual reciben su cuota,
 * pero SIN monto: se informan aparte para que la escuela los complete a mano. Es
 * preferible a inventar un número o a dejar al chico fuera de la cobranza.
 */
export async function generarCuotasDelPeriodo(
  ctx: AuthContext,
  periodo: string,
  concepto = "MENSUALIDAD",
): Promise<GeneracionCuotasDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const [jugadores, aranceles, yaTienen] = await Promise.all([
    jugadoresActivosParaCobranza(escuelaId),
    listarArancelesActivos(escuelaId, concepto),
    jugadoresConCuota(escuelaId, periodo, concepto),
  ]);
  if (jugadores.length === 0) {
    return { creadas: 0, yaExistian: 0, sinPrecio: 0 };
  }

  // Un solo query de precios y la resolución en memoria: evita una consulta por
  // categoría (`resolverArancel` es puro y está testeado aparte).
  const vigentes = aranceles.map((a) => ({
    id: a.id,
    categoriaId: a.categoriaId,
    concepto: a.concepto,
    monto: Number(a.monto.toString()),
    vigenteDesde: a.vigenteDesde,
  }));

  // `sinPrecio` se cuenta SOLO sobre los que se van a crear. Contarlo sobre todos
  // los activos haría que una segunda corrida informara "N quedaron sin monto"
  // sobre cuotas que ni se tocaron.
  // El precio se resuelve contra el período que se está emitiendo, no contra hoy:
  // generar septiembre durante agosto tiene que tomar el precio de septiembre.
  const referencia = referenciaDePrecio(periodo);

  let sinPrecio = 0;
  const filas = jugadores
    .filter((j) => !yaTienen.has(j.id))
    .map((j) => {
      const arancel = resolverArancel(vigentes, j.categoriaId, concepto, referencia);
      if (!arancel) sinPrecio++;
      return {
        jugadorId: j.id,
        periodo,
        concepto,
        monto: arancel ? arancel.monto : null,
      };
    });

  const creadas = await crearMembresiasFaltantes(escuelaId, filas);
  await registrarAuditoria(ctx, {
    accion: "MEMBRESIA_GENERAR_PERIODO",
    entidad: "Membresia",
    entidadId: escuelaId,
    escuelaId,
    motivo: `${periodo} ${concepto}: ${creadas} creadas de ${jugadores.length} activos`,
  });

  // `yaExistian` sale de lo REALMENTE insertado, no del pre-filtro: si otra
  // corrida simultánea creó algunas entre el SELECT y el INSERT, el unique las
  // descarta y el número sigue siendo exacto.
  return { creadas, yaExistian: jugadores.length - creadas, sinPrecio };
}

/** Lista las cuotas de la escuela (opcional: filtrar por período AAAA-MM). */
export async function listarMembresiasEscuela(
  ctx: AuthContext,
  periodo?: string,
): Promise<MembresiaDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarMembresias(escuelaId, periodo);
  if (rows.length === 0) return [];

  const jugadores = await obtenerJugadoresMinimos(
    escuelaId,
    [...new Set(rows.map((r) => r.jugadorId))],
  );
  const porId = new Map(jugadores.map((j) => [j.id, j]));

  return rows.map((m) => {
    const j = porId.get(m.jugadorId);
    return {
      id: m.id,
      jugadorId: m.jugadorId,
      jugadorNombre: j ? `${j.apellido}, ${j.nombre}` : "—",
      categoriaNombre: j?.categoria.nombre ?? "—",
      periodo: m.periodo,
      concepto: m.concepto,
      monto: aNumero(m.monto),
      descuento: aNumero(m.descuento),
      estado: m.estado,
      pagadaEn: m.pagadaEn?.toISOString() ?? null,
      medioPago: m.medioPago,
      referenciaPago: m.referenciaPago,
    };
  });
}

/** Crea o actualiza la cuota de un jugador para un período. Auditado. */
export async function registrarMembresiaEscuela(
  ctx: AuthContext,
  input: MembresiaInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  // El jugador debe pertenecer al tenant.
  const jugador = await obtenerJugador(escuelaId, input.jugadorId);
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, jugador.escuelaId);

  await upsertMembresia(escuelaId, input.jugadorId, input.periodo, input.concepto, {
    monto: input.monto,
    descuento: input.descuento,
    estado: input.estado,
  });
  await registrarAuditoria(ctx, {
    accion: "MEMBRESIA_REGISTRAR",
    entidad: "Membresia",
    entidadId: input.jugadorId,
    escuelaId,
    motivo: `${input.periodo} ${input.concepto} → ${input.estado}`,
  });
}

/**
 * Cambia el estado de una cuota (PENDIENTE/PAGADA/VENCIDA). Al pasar a PAGADA
 * registra además cuándo, con qué medio y con qué comprobante: sin eso el estado
 * no se puede conciliar contra el banco ni defender ante un reclamo. Auditado.
 */
export async function cambiarEstadoMembresiaEscuela(
  ctx: AuthContext,
  input: CambiarEstadoMembresiaInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const m = await obtenerMembresia(escuelaId, input.membresiaId);
  if (!m) throw new NotFoundError("Cuota no encontrada.");

  await registrarPagoMembresia(escuelaId, input.membresiaId, input.estado, {
    medioPago: input.medioPago,
    referenciaPago: input.referenciaPago,
  });
  await registrarAuditoria(ctx, {
    accion: "MEMBRESIA_ESTADO",
    entidad: "Membresia",
    entidadId: input.membresiaId,
    escuelaId,
    // El medio de pago va al motivo: es la traza de cómo entró la plata.
    motivo:
      `${m.periodo} ${m.concepto} → ${input.estado}` +
      (input.estado === "PAGADA" && input.medioPago ? ` (${input.medioPago})` : ""),
  });
}
