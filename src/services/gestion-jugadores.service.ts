import type { AuthContext } from "@/lib/auth/context";
import {
  requireRole,
  assertTenant,
  requireEscuela,
  assertMotivoSoporte,
  assertSoportePuedeEscribir,
  requirePermiso,
} from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarJugadoresGestion as repoListar,
  contarJugadoresGestion,
  obtenerJugadorGestion,
  actualizarJugadorDatos,
  actualizarFichaMedica as repoActualizarFichaMedica,
  contarAptosMedicosVencidos,
  actualizarEstadoJugador,
} from "@/repositories/jugador.repository";
import { contarCategoriasDeEscuela } from "@/repositories/categoria.repository";
import { actualizarPasswordUser } from "@/repositories/user.repository";
import { cuotasImpagasDeJugadores } from "@/repositories/membresia.repository";
import { categoriasDelDt } from "@/services/dt-scope";
import { registrarAuditoria } from "@/services/audit.service";
import { hashPassword, generarPasswordTemporal } from "@/lib/auth/password";
import { estadoCuenta, type CuotaParaDeuda } from "@/lib/cobranza";
import type { JugadorEditarInput, FichaMedicaInput } from "@/lib/validators/gestion";
import type { Posicion, Genero } from "@/types";
import { aGenero } from "@/lib/mappers/genero";

// Gestión de jugadores (G3/G5): Escuela y Súper Admin; el DT solo resetea
// contraseñas de familias de SUS categorías. Toda acción sensible se audita.

export interface JugadorGestionDTO {
  id: string;
  nombre: string;
  apellido: string;
  posicion: Posicion;
  dorsal: number | null;
  /** null = sin declarar (distinto de "X", que es una respuesta). */
  genero: Genero | null;
  fechaNacimiento: string;
  estado: string;
  categoriaId: string;
  categoriaNombre: string;
  codigoJugador: string | null;
  codigoRef: string | null;
  familiaEmail: string | null;
  familiaNombre: string | null;
  bloqueado: boolean;
  bloqueoTipo: string | null;
  /** Deuda de cobranza (Track A). No aplica al SUPER_ADMIN: ver `listarJugadoresGestion`. */
  enMora: boolean;
  montoVencido: number;
}

/**
 * `Decimal` de Prisma nunca sale hacia la UI (AGENTS.md §4: DTOs planos). No se
 * usa `?? null` sobre el valor convertido porque un monto de 0 es legítimo y
 * `0` es falsy: la ausencia se decide sobre el valor original.
 */
function aNumero(valor: { toString(): string } | null): number | null {
  return valor == null ? null : Number(valor.toString());
}

type JugadorGestionRow = NonNullable<
  Awaited<ReturnType<typeof obtenerJugadorGestion>>
>;

function aDTO(j: JugadorGestionRow): JugadorGestionDTO {
  const familia = j.padre ?? j.cuentaUser;
  return {
    id: j.id,
    nombre: j.nombre,
    apellido: j.apellido,
    posicion: j.posicion as Posicion,
    dorsal: j.dorsal,
    genero: aGenero(j.genero),
    fechaNacimiento: j.fechaNacimiento.toISOString(),
    estado: j.estado,
    categoriaId: j.categoria.id,
    categoriaNombre: j.categoria.nombre,
    codigoJugador: j.codigoJugador,
    codigoRef: j.codigoRef,
    familiaEmail: familia?.email ?? null,
    familiaNombre: j.padre?.nombre ?? null,
    bloqueado: familia?.bloqueado ?? false,
    bloqueoTipo: j.padre?.bloqueoTipo ?? null,
    // Se completa después de mapear (requiere una segunda consulta agregada
    // por página); acá el valor por defecto es "sin deuda conocida".
    enMora: false,
    montoVencido: 0,
  };
}

/** Resuelve la escuela sobre la que opera el actor (tenant o SA explícito). */
function escuelaObjetivo(ctx: AuthContext, escuelaId?: string): string {
  requireRole(ctx, ["ESCUELA_ADMIN", "SUPER_ADMIN"]);
  if (ctx.rol === "SUPER_ADMIN") {
    if (!escuelaId) throw new ValidationError("Falta la escuela.");
    // El roster de un tenant (PII de menores) no es de acceso ambiental: el SA
    // solo lo lee con una sesión de soporte activa para ESA escuela (M2).
    assertTenant(ctx, escuelaId);
    return escuelaId;
  }
  return requireEscuela(ctx);
}

export interface PaginatedJugadoresDTO {
  items: JugadorGestionDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listarJugadoresGestion(
  ctx: AuthContext,
  filtros: {
    escuelaId?: string;
    id?: string;
    categoriaId?: string;
    estado?: string;
    search?: string;
    bloqueado?: boolean;
    page?: number;
    limit?: number;
  } = {},
): Promise<PaginatedJugadoresDTO> {
  const escuelaId = escuelaObjetivo(ctx, filtros.escuelaId);
  const page = Math.max(1, filtros.page ?? 1);
  const limit = Math.max(1, filtros.limit ?? 20);
  const skip = (page - 1) * limit;

  // ELIMINADO solo lo ve el Súper Admin pidiéndolo explícitamente.
  const estados =
    filtros.estado === "ELIMINADO" && ctx.rol === "SUPER_ADMIN"
      ? ["ELIMINADO"]
      : filtros.estado && filtros.estado !== "ELIMINADO"
        ? [filtros.estado]
        : ["PENDIENTE", "ACTIVO", "INACTIVO"];

  const [rows, total] = await Promise.all([
    repoListar(escuelaId, {
      id: filtros.id,
      categoriaId: filtros.categoriaId,
      estados,
      search: filtros.search,
      bloqueado: filtros.bloqueado,
      skip,
      take: limit,
    }),
    contarJugadoresGestion(escuelaId, {
      id: filtros.id,
      categoriaId: filtros.categoriaId,
      estados,
      search: filtros.search,
      bloqueado: filtros.bloqueado,
    }),
  ]);

  const items = rows.map(aDTO);

  // La deuda es exclusiva de ESCUELA_ADMIN: la cobranza no tiene acceso
  // ambiental del SUPER_ADMIN, ni siquiera con sesión de soporte activa —
  // mismo alcance que el resto de los servicios de `membresia.service.ts`.
  if (ctx.rol === "ESCUELA_ADMIN" && items.length > 0) {
    const impagas = await cuotasImpagasDeJugadores(escuelaId, items.map((j) => j.id));
    const porJugador = new Map<string, CuotaParaDeuda[]>();
    for (const c of impagas) {
      const lista = porJugador.get(c.jugadorId) ?? [];
      lista.push({
        periodo: c.periodo,
        concepto: c.concepto,
        estado: c.estado,
        monto: aNumero(c.monto),
        descuento: aNumero(c.descuento),
      });
      porJugador.set(c.jugadorId, lista);
    }
    const hoy = new Date();
    for (const j of items) {
      const cuenta = estadoCuenta(porJugador.get(j.id) ?? [], hoy);
      j.enMora = cuenta.enMora;
      j.montoVencido = cuenta.montoVencido;
    }
  }

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Jugadores activos en mora (Escuela Admin únicamente: la deuda no es un dato
 * ambiental del SUPER_ADMIN, ver `listarJugadoresGestion`). Reusa el cruce de
 * cobranza ya calculado ahí — no reimplementa `enMora`/`montoVencido`. El
 * límite alto asume que ninguna escuela supera 5000 jugadores activos.
 */
export async function listarMorosos(ctx: AuthContext): Promise<JugadorGestionDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const res = await listarJugadoresGestion(ctx, { estado: "ACTIVO", limit: 5000 });
  return res.items.filter((j) => j.enMora);
}

async function cargarJugador(ctx: AuthContext, jugadorId: string) {
  requireRole(ctx, ["ESCUELA_ADMIN", "SUPER_ADMIN"]);
  const jugador = await obtenerJugadorGestion(ctx.escuelaId, jugadorId);
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, jugador.escuelaId);
  return jugador;
}

/** Edita los datos del jugador (Escuela de su tenant o Súper Admin). */
export async function editarJugador(
  ctx: AuthContext,
  data: JugadorEditarInput,
  motivo?: string,
): Promise<void> {
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);
  const jugador = await cargarJugador(ctx, data.jugadorId);
  const cuenta = await contarCategoriasDeEscuela(jugador.escuelaId, [
    data.categoriaId,
  ]);
  if (cuenta !== 1) {
    throw new ValidationError("Esa categoría no pertenece a la escuela.");
  }
  const res = await actualizarJugadorDatos(ctx.escuelaId, jugador.id, {
    nombre: data.nombre,
    apellido: data.apellido,
    fechaNacimiento: data.fechaNacimiento,
    posicion: data.posicion,
    dorsal: data.dorsal ?? null,
    categoriaId: data.categoriaId,
    genero: data.genero,
  });
  if (res.count === 0) throw new NotFoundError("Jugador no encontrado.");
  await registrarAuditoria(ctx, {
    accion: "EDITAR_JUGADOR",
    entidad: "Jugador",
    entidadId: jugador.id,
    escuelaId: jugador.escuelaId,
    motivo,
  });
}

// --- Ficha administrativa y médica (HABEAS-DATA.md, datos sensibles) -------
//
// `autorizaDatosSalud` gatea el subconjunto de SALUD (eps, rh, alergias,
// condicionesMedicas, aptoMedicoVence) en los dos sentidos: sin consentimiento
// no se GUARDA (art. 9 Ley 1581: autorización previa a la recolección, no solo
// a la exhibición) y, en lectura, se vuelve a filtrar como defensa en
// profundidad. Documento, número y contacto de emergencia NO son datos de
// salud — quedan cubiertos por la autorización general de la Política y no
// dependen de este consentimiento específico.

export interface FichaMedicaEscuelaDTO {
  jugadorId: string;
  nombre: string;
  apellido: string;
  categoriaNombre: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  autorizaDatosSalud: boolean;
  autorizacionDatosSaludEn: string | null;
  eps: string | null;
  rh: string | null;
  alergias: string | null;
  condicionesMedicas: string | null;
  aptoMedicoVence: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  contactoEmergenciaParentesco: string | null;
  autorizaTraslado: boolean;
}

/**
 * Ficha completa (ESCUELA_ADMIN / SUPER_ADMIN). Es una lectura deliberada del
 * expediente de un menor — a diferencia de la vista acotada del DT, que es
 * contexto incidental — así que queda en `AuditLog`.
 */
export async function obtenerFichaMedicaEscuela(
  ctx: AuthContext,
  jugadorId: string,
): Promise<FichaMedicaEscuelaDTO> {
  const jugador = await cargarJugador(ctx, jugadorId);
  await registrarAuditoria(ctx, {
    accion: "LEER_FICHA_MEDICA",
    entidad: "Jugador",
    entidadId: jugador.id,
    escuelaId: jugador.escuelaId,
  });

  const hayConsentimiento = jugador.autorizaDatosSalud;
  return {
    jugadorId: jugador.id,
    nombre: jugador.nombre,
    apellido: jugador.apellido,
    categoriaNombre: jugador.categoria.nombre,
    tipoDocumento: jugador.tipoDocumento,
    numeroDocumento: jugador.numeroDocumento,
    autorizaDatosSalud: jugador.autorizaDatosSalud,
    autorizacionDatosSaludEn: jugador.autorizacionDatosSaludEn?.toISOString() ?? null,
    eps: hayConsentimiento ? jugador.eps : null,
    rh: hayConsentimiento ? jugador.rh : null,
    alergias: hayConsentimiento ? jugador.alergias : null,
    condicionesMedicas: hayConsentimiento ? jugador.condicionesMedicas : null,
    aptoMedicoVence: hayConsentimiento
      ? (jugador.aptoMedicoVence?.toISOString() ?? null)
      : null,
    contactoEmergenciaNombre: jugador.contactoEmergenciaNombre,
    contactoEmergenciaTelefono: jugador.contactoEmergenciaTelefono,
    contactoEmergenciaParentesco: jugador.contactoEmergenciaParentesco,
    autorizaTraslado: jugador.autorizaTraslado,
  };
}

/** Edita la ficha médica (Escuela de su tenant o Súper Admin). Auditada. */
export async function actualizarFichaMedica(
  ctx: AuthContext,
  data: FichaMedicaInput,
  motivo?: string,
): Promise<void> {
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);
  const jugador = await cargarJugador(ctx, data.jugadorId);

  const res = await repoActualizarFichaMedica(ctx.escuelaId, jugador.id, {
    tipoDocumento: data.tipoDocumento,
    numeroDocumento: data.numeroDocumento,
    // Sin consentimiento, se descarta lo enviado: no alcanza con ocultarlo
    // después, la autorización tiene que ser previa a la recolección.
    eps: data.autorizaDatosSalud ? data.eps : null,
    rh: data.autorizaDatosSalud ? data.rh : null,
    alergias: data.autorizaDatosSalud ? data.alergias : null,
    condicionesMedicas: data.autorizaDatosSalud ? data.condicionesMedicas : null,
    aptoMedicoVence: data.autorizaDatosSalud ? data.aptoMedicoVence : null,
    contactoEmergenciaNombre: data.contactoEmergenciaNombre,
    // `telefonoOpcional` es `.nullish()` (permite no enviar el campo): se
    // normaliza `undefined` a `null` para la columna, que no distingue "no
    // llegó" de "se borró".
    contactoEmergenciaTelefono: data.contactoEmergenciaTelefono ?? null,
    contactoEmergenciaParentesco: data.contactoEmergenciaParentesco,
    autorizaTraslado: data.autorizaTraslado,
    autorizaDatosSalud: data.autorizaDatosSalud,
    // Mismo patrón que `consentimientoFotoFecha`: se sella `now()` en cada
    // guardado con consentimiento activo, no solo la primera vez.
    autorizacionDatosSaludEn: data.autorizaDatosSalud ? new Date() : null,
  });
  if (res.count === 0) throw new NotFoundError("Jugador no encontrado.");
  await registrarAuditoria(ctx, {
    accion: "EDITAR_FICHA_MEDICA",
    entidad: "Jugador",
    entidadId: jugador.id,
    escuelaId: jugador.escuelaId,
    motivo,
  });
}

/**
 * KPI del dashboard: cuántos jugadores activos tienen el apto médico vencido.
 * Es un conteo agregado, no expone fichas individuales — mismo criterio que
 * `enMora` (hito 22): no se audita por consulta.
 */
export async function contarAptosMedicosVencidosEscuela(
  ctx: AuthContext,
): Promise<number> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  return contarAptosMedicosVencidos(escuelaId, new Date());
}

/** Inactiva o reactiva un jugador, con motivo obligatorio (auditado). */
export async function cambiarEstadoJugadorGestion(
  ctx: AuthContext,
  jugadorId: string,
  estado: "ACTIVO" | "INACTIVO",
  motivo: string,
): Promise<void> {
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);
  const jugador = await cargarJugador(ctx, jugadorId);
  if (jugador.estado === "ELIMINADO") {
    throw new NotFoundError("Jugador no encontrado.");
  }
  await actualizarEstadoJugador(jugador.escuelaId, jugador.id, estado);
  await registrarAuditoria(ctx, {
    accion: estado === "ACTIVO" ? "REACTIVAR_JUGADOR" : "INACTIVAR_JUGADOR",
    entidad: "Jugador",
    entidadId: jugador.id,
    escuelaId: jugador.escuelaId,
    motivo,
  });
}

/**
 * Eliminación LÓGICA (estado ELIMINADO, reversible). Solo Súper Admin; exige
 * escribir el nombre del jugador como confirmación.
 */
export async function eliminarJugadorLogico(
  ctx: AuthContext,
  jugadorId: string,
  confirmacion: string,
  motivo: string,
): Promise<void> {
  requirePermiso(ctx, "SOPORTE_TENANT");
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);
  const jugador = await cargarJugador(ctx, jugadorId);
  const nombreCompleto = `${jugador.nombre} ${jugador.apellido}`.toLowerCase();
  if (confirmacion.trim().toLowerCase() !== nombreCompleto) {
    throw new ValidationError(
      "La confirmación no coincide con el nombre del jugador.",
    );
  }
  await actualizarEstadoJugador(jugador.escuelaId, jugador.id, "ELIMINADO");
  await registrarAuditoria(ctx, {
    accion: "ELIMINAR_JUGADOR",
    entidad: "Jugador",
    entidadId: jugador.id,
    escuelaId: jugador.escuelaId,
    motivo,
  });
}

/** Revierte la eliminación lógica (queda INACTIVO). Solo Súper Admin. */
export async function restaurarJugador(
  ctx: AuthContext,
  jugadorId: string,
  motivo?: string,
): Promise<void> {
  requirePermiso(ctx, "SOPORTE_TENANT");
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);
  const jugador = await cargarJugador(ctx, jugadorId);
  if (jugador.estado !== "ELIMINADO") {
    throw new ValidationError("El jugador no está eliminado.");
  }
  await actualizarEstadoJugador(jugador.escuelaId, jugador.id, "INACTIVO");
  await registrarAuditoria(ctx, {
    accion: "RESTAURAR_JUGADOR",
    entidad: "Jugador",
    entidadId: jugador.id,
    escuelaId: jugador.escuelaId,
    motivo,
  });
}

/** Reset interno: genera temporal de un solo uso para la cuenta de familia. */
async function resetFamilia(
  ctx: AuthContext,
  jugador: JugadorGestionRow,
  motivo?: string,
): Promise<{ email: string; passwordTemporal: string }> {
  const familia = jugador.cuentaUser ?? jugador.padre;
  if (!familia) {
    throw new ValidationError("Este jugador no tiene cuenta de familia vinculada.");
  }
  const passwordTemporal = generarPasswordTemporal();
  await actualizarPasswordUser(familia.id, await hashPassword(passwordTemporal));
  await registrarAuditoria(ctx, {
    accion: "RESET_PASSWORD_FAMILIA",
    entidad: "Jugador",
    entidadId: jugador.id,
    escuelaId: jugador.escuelaId,
    motivo,
  });
  return { email: familia.email, passwordTemporal };
}

/** Reset de contraseña de la familia (Escuela de su tenant o Súper Admin). */
export async function resetPasswordFamilia(
  ctx: AuthContext,
  jugadorId: string,
  motivo?: string,
): Promise<{ email: string; passwordTemporal: string }> {
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);
  const jugador = await cargarJugador(ctx, jugadorId);
  return resetFamilia(ctx, jugador, motivo);
}

/** Reset de contraseña por el DT: solo familias de SUS categorías (G5). */
export async function resetPasswordFamiliaDt(
  ctx: AuthContext,
  jugadorId: string,
): Promise<{ email: string; passwordTemporal: string }> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugador = await obtenerJugadorGestion(escuelaId, jugadorId);
  if (
    !jugador ||
    jugador.escuelaId !== escuelaId ||
    !categoriaIds.includes(jugador.categoria.id)
  ) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  if (jugador.estado === "ELIMINADO") {
    throw new NotFoundError("Jugador no encontrado.");
  }
  return resetFamilia(ctx, jugador);
}

/** Email de la familia para la ficha del DT (sin exponer más datos). */
export async function obtenerCredencialesFamiliaDt(
  ctx: AuthContext,
  jugadorId: string,
): Promise<{ email: string | null; bloqueado: boolean }> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugador = await obtenerJugadorGestion(escuelaId, jugadorId);
  if (
    !jugador ||
    jugador.escuelaId !== escuelaId ||
    !categoriaIds.includes(jugador.categoria.id)
  ) {
    throw new NotFoundError("Jugador no encontrado.");
  }
  const familia = jugador.cuentaUser ?? jugador.padre;
  return {
    email: familia?.email ?? null,
    bloqueado: familia?.bloqueado ?? false,
  };
}
