import type { AuthContext } from "@/lib/auth/context";
import { requirePermiso } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarUsersAdmin,
  obtenerUserSeguro,
  actualizarUserDatos,
  actualizarPasswordUser,
} from "@/repositories/user.repository";
import {
  obtenerEscuela,
  slugExisteGlobal,
  emailExisteGlobal,
  actualizarEscuelaAdmin,
} from "@/repositories/escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { hashPassword, generarPasswordTemporal } from "@/lib/auth/password";
import type {
  UsuarioEditarInput,
  EscuelaEditarInput,
} from "@/lib/validators/gestion";
import type { Rol } from "@/types";

// Gestión global de usuarios y escuelas (G4). Solo SUPER_ADMIN; auditado.

export interface UsuarioAdminDTO {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  escuelaNombre: string | null;
  activo: boolean;
  bloqueado: boolean;
  bloqueoTipo: string | null;
  createdAt: string;
}

export async function listarUsuariosAdmin(
  ctx: AuthContext,
  filtros: { rol?: string; escuelaId?: string } = {},
): Promise<UsuarioAdminDTO[]> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");
  const rows = await listarUsersAdmin(filtros);
  return rows.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol as Rol,
    escuelaNombre: u.escuela?.nombre ?? null,
    activo: u.activo,
    bloqueado: u.bloqueado,
    bloqueoTipo: u.bloqueoTipo,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function editarUsuarioAdmin(
  ctx: AuthContext,
  data: UsuarioEditarInput,
): Promise<void> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");
  const user = await obtenerUserSeguro(data.userId);
  if (!user) throw new NotFoundError("Usuario no encontrado.");
  if (user.id === ctx.userId && !data.activo) {
    throw new ValidationError("No puedes desactivar tu propia cuenta.");
  }
  if (data.email !== user.email && (await emailExisteGlobal(data.email))) {
    throw new ValidationError("Ya existe un usuario con ese email.");
  }
  await actualizarUserDatos(user.id, {
    nombre: data.nombre,
    email: data.email,
    activo: data.activo,
  });
  await registrarAuditoria(ctx, {
    accion: "EDITAR_USUARIO",
    entidad: "User",
    entidadId: user.id,
    escuelaId: user.escuelaId,
  });
}

export async function resetPasswordUsuarioAdmin(
  ctx: AuthContext,
  userId: string,
): Promise<{ email: string; passwordTemporal: string }> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");
  const user = await obtenerUserSeguro(userId);
  if (!user) throw new NotFoundError("Usuario no encontrado.");
  if (user.id === ctx.userId) {
    throw new ValidationError("Usa 'Mi cuenta' para cambiar tu contraseña.");
  }
  const passwordTemporal = generarPasswordTemporal();
  await actualizarPasswordUser(user.id, await hashPassword(passwordTemporal));
  await registrarAuditoria(ctx, {
    accion: "RESET_PASSWORD_USUARIO",
    entidad: "User",
    entidadId: user.id,
    escuelaId: user.escuelaId,
  });
  return { email: user.email, passwordTemporal };
}

export async function editarEscuelaSuperAdmin(
  ctx: AuthContext,
  data: EscuelaEditarInput,
): Promise<void> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");
  const escuela = await obtenerEscuela(data.escuelaId);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");
  if (data.slug !== escuela.slug && (await slugExisteGlobal(data.slug))) {
    throw new ValidationError("Ese slug ya está en uso por otra escuela.");
  }
  await actualizarEscuelaAdmin(escuela.id, {
    nombre: data.nombre,
    slug: data.slug,
    colorPrimario: data.colorPrimario,
    activa: data.activa,
  });
  await registrarAuditoria(ctx, {
    accion: "EDITAR_ESCUELA",
    entidad: "Escuela",
    entidadId: escuela.id,
    escuelaId: escuela.id,
    motivo: data.activa ? undefined : "Escuela desactivada",
  });
}
