import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { hashPassword, generarPasswordTemporal } from "@/lib/auth/password";
import {
  listarEntrenadores,
  obtenerEntrenador,
  reemplazarCategoriasEntrenador,
} from "@/repositories/entrenador.repository";
import { emailExisteGlobal } from "@/repositories/escuela.repository";
import { contarCategoriasDeEscuela } from "@/repositories/categoria.repository";
import {
  actualizarUserDatos,
  actualizarPasswordUser,
} from "@/repositories/user.repository";
import { registrarAuditoria } from "@/services/audit.service";
import type { DtInput } from "@/lib/validators/escuela";
import type { DtEditarInput } from "@/lib/validators/gestion";

export interface DtDTO {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  categorias: { id: string; nombre: string }[];
}

export async function listarDts(ctx: AuthContext): Promise<DtDTO[]> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const rows = await listarEntrenadores(escuelaId);
  return rows.map((e) => ({
    id: e.id,
    nombre: e.user.nombre,
    email: e.user.email,
    activo: e.user.activo,
    categorias: e.categorias.map((ec) => ({
      id: ec.categoria.id,
      nombre: ec.categoria.nombre,
    })),
  }));
}

/**
 * Crea un DT: usuario (rol DT) + Entrenador + asignación de categorías, atómico.
 * Devuelve la contraseña temporal (se muestra una sola vez).
 */
export async function crearDt(
  ctx: AuthContext,
  data: DtInput,
): Promise<{ email: string; passwordTemporal: string }> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  if (await emailExisteGlobal(data.email)) {
    throw new ValidationError("Ya existe un usuario con ese email.");
  }
  // Todas las categorías deben pertenecer a esta escuela (anti cruce de tenant).
  const cuenta = await contarCategoriasDeEscuela(escuelaId, data.categoriaIds);
  if (cuenta !== data.categoriaIds.length) {
    throw new ValidationError("Alguna categoría no pertenece a tu escuela.");
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await hashPassword(passwordTemporal);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        nombre: data.nombre,
        rol: "DT",
        escuelaId,
      },
    });
    const entrenador = await tx.entrenador.create({
      data: { userId: user.id, escuelaId },
    });
    await tx.entrenadorCategoria.createMany({
      data: data.categoriaIds.map((categoriaId) => ({
        entrenadorId: entrenador.id,
        categoriaId,
      })),
    });
  });

  return { email: data.email, passwordTemporal };
}

/** Edita nombre/estado/categorías de un DT del tenant (auditado). */
export async function actualizarDt(
  ctx: AuthContext,
  data: DtEditarInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const entrenador = await obtenerEntrenador(escuelaId, data.entrenadorId);
  if (!entrenador) throw new NotFoundError("DT no encontrado.");

  const cuenta = await contarCategoriasDeEscuela(escuelaId, data.categoriaIds);
  if (cuenta !== data.categoriaIds.length) {
    throw new ValidationError("Alguna categoría no pertenece a tu escuela.");
  }

  await actualizarUserDatos(entrenador.user.id, {
    nombre: data.nombre,
    activo: data.activo,
  });
  await reemplazarCategoriasEntrenador(entrenador.id, data.categoriaIds);
  await registrarAuditoria(ctx, {
    accion: "EDITAR_DT",
    entidad: "Entrenador",
    entidadId: entrenador.id,
    escuelaId,
  });
}

/** Reset de contraseña de un DT del tenant (temporal de un solo uso, auditado). */
export async function resetPasswordDt(
  ctx: AuthContext,
  entrenadorId: string,
): Promise<{ email: string; passwordTemporal: string }> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);

  const entrenador = await obtenerEntrenador(escuelaId, entrenadorId);
  if (!entrenador) throw new NotFoundError("DT no encontrado.");

  const passwordTemporal = generarPasswordTemporal();
  await actualizarPasswordUser(
    entrenador.user.id,
    await hashPassword(passwordTemporal),
  );
  await registrarAuditoria(ctx, {
    accion: "RESET_PASSWORD_DT",
    entidad: "Entrenador",
    entidadId: entrenador.id,
    escuelaId,
  });
  return { email: entrenador.user.email, passwordTemporal };
}
