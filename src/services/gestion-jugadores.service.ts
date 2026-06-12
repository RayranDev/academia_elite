import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarJugadoresGestion as repoListar,
  obtenerJugadorGestion,
  actualizarJugadorDatos,
  actualizarEstadoJugador,
} from "@/repositories/jugador.repository";
import { contarCategoriasDeEscuela } from "@/repositories/categoria.repository";
import { actualizarPasswordUser } from "@/repositories/user.repository";
import { categoriasDelDt } from "@/services/dt-scope";
import { registrarAuditoria } from "@/services/audit.service";
import { hashPassword, generarPasswordTemporal } from "@/lib/auth/password";
import type { JugadorEditarInput } from "@/lib/validators/gestion";
import type { Posicion } from "@/types";

// Gestión de jugadores (G3/G5): Escuela y Súper Admin; el DT solo resetea
// contraseñas de familias de SUS categorías. Toda acción sensible se audita.

export interface JugadorGestionDTO {
  id: string;
  nombre: string;
  apellido: string;
  posicion: Posicion;
  dorsal: number | null;
  fechaNacimiento: string;
  estado: string;
  categoriaId: string;
  categoriaNombre: string;
  familiaEmail: string | null;
  familiaNombre: string | null;
  bloqueado: boolean;
  bloqueoTipo: string | null;
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
    fechaNacimiento: j.fechaNacimiento.toISOString(),
    estado: j.estado,
    categoriaId: j.categoria.id,
    categoriaNombre: j.categoria.nombre,
    familiaEmail: familia?.email ?? null,
    familiaNombre: j.padre?.nombre ?? null,
    bloqueado: familia?.bloqueado ?? false,
    bloqueoTipo: j.padre?.bloqueoTipo ?? null,
  };
}

/** Resuelve la escuela sobre la que opera el actor (tenant o SA explícito). */
function escuelaObjetivo(ctx: AuthContext, escuelaId?: string): string {
  requireRole(ctx, ["ESCUELA_ADMIN", "SUPER_ADMIN"]);
  if (ctx.rol === "SUPER_ADMIN") {
    if (!escuelaId) throw new ValidationError("Falta la escuela.");
    return escuelaId;
  }
  return requireEscuela(ctx);
}

export async function listarJugadoresGestion(
  ctx: AuthContext,
  filtros: { escuelaId?: string; categoriaId?: string; estado?: string } = {},
): Promise<JugadorGestionDTO[]> {
  const escuelaId = escuelaObjetivo(ctx, filtros.escuelaId);
  // ELIMINADO solo lo ve el Súper Admin pidiéndolo explícitamente.
  const estados =
    filtros.estado === "ELIMINADO" && ctx.rol === "SUPER_ADMIN"
      ? ["ELIMINADO"]
      : filtros.estado && filtros.estado !== "ELIMINADO"
        ? [filtros.estado]
        : ["PENDIENTE", "ACTIVO", "INACTIVO"];
  const rows = await repoListar(escuelaId, {
    categoriaId: filtros.categoriaId,
    estados,
  });
  return rows.map(aDTO);
}

async function cargarJugador(ctx: AuthContext, jugadorId: string) {
  requireRole(ctx, ["ESCUELA_ADMIN", "SUPER_ADMIN"]);
  const jugador = await obtenerJugadorGestion(jugadorId);
  if (!jugador) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, jugador.escuelaId);
  return jugador;
}

/** Edita los datos del jugador (Escuela de su tenant o Súper Admin). */
export async function editarJugador(
  ctx: AuthContext,
  data: JugadorEditarInput,
): Promise<void> {
  const jugador = await cargarJugador(ctx, data.jugadorId);
  const cuenta = await contarCategoriasDeEscuela(jugador.escuelaId, [
    data.categoriaId,
  ]);
  if (cuenta !== 1) {
    throw new ValidationError("Esa categoría no pertenece a la escuela.");
  }
  await actualizarJugadorDatos(jugador.id, {
    nombre: data.nombre,
    apellido: data.apellido,
    fechaNacimiento: data.fechaNacimiento,
    posicion: data.posicion,
    dorsal: data.dorsal ?? null,
    categoriaId: data.categoriaId,
  });
  await registrarAuditoria(ctx, {
    accion: "EDITAR_JUGADOR",
    entidad: "Jugador",
    entidadId: jugador.id,
    escuelaId: jugador.escuelaId,
  });
}

/** Inactiva o reactiva un jugador, con motivo obligatorio (auditado). */
export async function cambiarEstadoJugadorGestion(
  ctx: AuthContext,
  jugadorId: string,
  estado: "ACTIVO" | "INACTIVO",
  motivo: string,
): Promise<void> {
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
  requireRole(ctx, ["SUPER_ADMIN"]);
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
): Promise<void> {
  requireRole(ctx, ["SUPER_ADMIN"]);
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
  });
}

/** Reset interno: genera temporal de un solo uso para la cuenta de familia. */
async function resetFamilia(
  ctx: AuthContext,
  jugador: JugadorGestionRow,
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
  });
  return { email: familia.email, passwordTemporal };
}

/** Reset de contraseña de la familia (Escuela de su tenant o Súper Admin). */
export async function resetPasswordFamilia(
  ctx: AuthContext,
  jugadorId: string,
): Promise<{ email: string; passwordTemporal: string }> {
  const jugador = await cargarJugador(ctx, jugadorId);
  return resetFamilia(ctx, jugador);
}

/** Reset de contraseña por el DT: solo familias de SUS categorías (G5). */
export async function resetPasswordFamiliaDt(
  ctx: AuthContext,
  jugadorId: string,
): Promise<{ email: string; passwordTemporal: string }> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugador = await obtenerJugadorGestion(jugadorId);
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
export async function credencialesFamiliaDt(
  ctx: AuthContext,
  jugadorId: string,
): Promise<{ email: string | null; bloqueado: boolean }> {
  const { escuelaId, categoriaIds } = await categoriasDelDt(ctx);
  const jugador = await obtenerJugadorGestion(jugadorId);
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
