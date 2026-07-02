import { randomUUID } from "node:crypto";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela, requirePermiso } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { hashPassword, generarPasswordTemporal } from "@/lib/auth/password";
import { detectarTipoImagen, procesarEscudo } from "@/lib/foto/process";
import { guardarFoto, borrarFoto } from "@/lib/foto/storage";
import {
  listarEscuelasGlobal,
  contarEscuelasGlobal,
  slugExisteGlobal,
  emailExisteGlobal,
  obtenerEscuela,
  actualizarBrandingEscuela,
  crearEscuelaConAdmin,
} from "@/repositories/escuela.repository";
import type { BrandingInput } from "@/lib/validators/escuela";
import { obtenerLeadGlobal } from "@/repositories/lead.repository";
import type { ConvertirLeadInput, CrearEscuelaInput } from "@/lib/validators/admin";

export interface EscuelaDTO {
  id: string;
  nombre: string;
  slug: string;
  colorPrimario: string;
  activa: boolean;
  jugadores: number;
  categorias: number;
  usuarios: number;
  createdAt: string;
}

export interface MiEscuelaDTO {
  id: string;
  nombre: string;
  slug: string;
  colorPrimario: string;
  logoUrl: string | null;
  frecuenciaEvaluacionDias: number;
}

/** Devuelve la escuela del ESCUELA_ADMIN actual (para branding y layout). */
export async function obtenerMiEscuela(
  ctx: AuthContext,
): Promise<MiEscuelaDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const e = await obtenerEscuela(escuelaId);
  if (!e) throw new NotFoundError("Escuela no encontrada.");
  return {
    id: e.id,
    nombre: e.nombre,
    slug: e.slug,
    colorPrimario: e.colorPrimario,
    logoUrl: e.logoUrl,
    frecuenciaEvaluacionDias: e.frecuenciaEvaluacionDias,
  };
}

/** Branding del tenant (nombre + color + escudo) para cualquier rol de la escuela. */
export async function obtenerBrandingTenant(ctx: AuthContext): Promise<{
  escuelaId: string;
  nombre: string;
  colorPrimario: string;
  tieneEscudo: boolean;
}> {
  requireRole(ctx, ["ESCUELA_ADMIN", "DT", "JUGADOR"]);
  const escuelaId = requireEscuela(ctx);
  const e = await obtenerEscuela(escuelaId);
  if (!e) throw new NotFoundError("Escuela no encontrada.");
  return {
    escuelaId: e.id,
    nombre: e.nombre,
    colorPrimario: e.colorPrimario,
    tieneEscudo: !!e.logoUrl,
  };
}

/** Sube el escudo (PNG) de la escuela: solo ESCUELA_ADMIN de su tenant. */
export async function subirEscudo(
  ctx: AuthContext,
  original: Buffer,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  if (detectarTipoImagen(original) !== "png") {
    throw new ValidationError("El escudo debe ser un PNG.");
  }
  const procesado = await procesarEscudo(original);
  const anterior = (await obtenerEscuela(escuelaId))?.logoUrl;
  const nombre = `escudo-${randomUUID()}.png`;
  await guardarFoto(nombre, procesado);
  await actualizarBrandingEscuela(escuelaId, { logoUrl: nombre });
  // El escudo anterior queda huérfano en el bucket: se borra best-effort.
  if (anterior && anterior !== nombre) {
    await borrarFoto(anterior);
  }
}

export async function actualizarBranding(
  ctx: AuthContext,
  data: BrandingInput,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  // El escudo (logoUrl) se gestiona aparte (subirEscudo); no se toca aquí.
  await actualizarBrandingEscuela(escuelaId, {
    nombre: data.nombre,
    colorPrimario: data.colorPrimario,
    frecuenciaEvaluacionDias: data.frecuenciaEvaluacionDias,
  });
}

/** Una escuela concreta para el panel global (Súper Admin). */
export async function obtenerEscuelaAdmin(
  ctx: AuthContext,
  escuelaId: string,
): Promise<{
  id: string;
  nombre: string;
  slug: string;
  codigoRef: string | null;
  colorPrimario: string;
  activa: boolean;
}> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");
  const e = await obtenerEscuela(escuelaId);
  if (!e) throw new NotFoundError("Escuela no encontrada.");
  return {
    id: e.id,
    nombre: e.nombre,
    slug: e.slug,
    codigoRef: e.codigoRef,
    colorPrimario: e.colorPrimario,
    activa: e.activa,
  };
}

export async function listarEscuelas(ctx: AuthContext): Promise<EscuelaDTO[]> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");
  const rows = await listarEscuelasGlobal();
  return rows.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    slug: e.slug,
    colorPrimario: e.colorPrimario,
    activa: e.activa,
    jugadores: e._count.jugadores,
    categorias: e._count.categorias,
    usuarios: e._count.users,
    createdAt: e.createdAt.toISOString(),
  }));
}

export interface PaginatedEscuelasDTO {
  items: EscuelaDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listarEscuelasPaginado(
  ctx: AuthContext,
  opts?: { page?: number; limit?: number; search?: string }
): Promise<PaginatedEscuelasDTO> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.max(1, opts?.limit ?? 10);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    listarEscuelasGlobal({ skip, take: limit, search: opts?.search }),
    contarEscuelasGlobal(opts?.search),
  ]);

  const items = rows.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    slug: e.slug,
    colorPrimario: e.colorPrimario,
    activa: e.activa,
    jugadores: e._count.jugadores,
    categorias: e._count.categorias,
    usuarios: e._count.users,
    createdAt: e.createdAt.toISOString(),
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Convierte un lead en una escuela funcional con su ESCUELA_ADMIN.
 * Atómico: escuela + usuario admin + cambio de estado del lead + auditoría.
 * Devuelve la contraseña temporal (se muestra UNA vez; nunca se almacena en claro).
 */
export async function convertirLeadEnEscuela(
  ctx: AuthContext,
  input: ConvertirLeadInput,
): Promise<{ escuelaId: string; adminEmail: string; passwordTemporal: string }> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");

  const lead = await obtenerLeadGlobal(input.leadId);
  if (!lead) throw new NotFoundError("Lead no encontrado.");
  if (lead.estado === "CONVERTIDO") {
    throw new ValidationError("Este lead ya fue convertido.");
  }
  if (await slugExisteGlobal(input.slug)) {
    throw new ValidationError("Ese slug ya está en uso por otra escuela.");
  }
  if (await emailExisteGlobal(input.adminEmail)) {
    throw new ValidationError("Ya existe un usuario con ese email.");
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await hashPassword(passwordTemporal);

  const escuelaId = await crearEscuelaConAdmin({
    nombreEscuela: input.nombreEscuela,
    slug: input.slug,
    adminEmail: input.adminEmail,
    adminNombre: input.adminNombre,
    passwordHash,
    actorId: ctx.userId,
    actorRol: ctx.rol,
    accion: "CONVERTIR_LEAD",
    motivo: `Lead ${input.leadId} → escuela "${input.nombreEscuela}"`,
    leadId: input.leadId,
  });

  return { escuelaId, adminEmail: input.adminEmail, passwordTemporal };
}

/**
 * Alta directa de una escuela con su ESCUELA_ADMIN inicial (sin pasar por leads).
 * Operación de plataforma del SUPER_ADMIN; NO toca datos internos de un tenant.
 * Devuelve la contraseña temporal del admin (se muestra UNA sola vez).
 */
export async function crearEscuelaDirecta(
  ctx: AuthContext,
  input: CrearEscuelaInput,
): Promise<{ escuelaId: string; adminEmail: string; passwordTemporal: string }> {
  requirePermiso(ctx, "GESTIONAR_ESCUELAS");

  if (await slugExisteGlobal(input.slug)) {
    throw new ValidationError("Ese slug ya está en uso por otra escuela.");
  }
  if (await emailExisteGlobal(input.adminEmail)) {
    throw new ValidationError("Ya existe un usuario con ese email.");
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await hashPassword(passwordTemporal);

  const escuelaId = await crearEscuelaConAdmin({
    nombreEscuela: input.nombreEscuela,
    slug: input.slug,
    adminEmail: input.adminEmail,
    adminNombre: input.adminNombre,
    passwordHash,
    actorId: ctx.userId,
    actorRol: ctx.rol,
    accion: "CREAR_ESCUELA",
    motivo: `Alta directa de escuela "${input.nombreEscuela}"`,
  });

  return { escuelaId, adminEmail: input.adminEmail, passwordTemporal };
}
