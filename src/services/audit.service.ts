import type { AuthContext } from "@/lib/auth/context";
import { requirePermiso } from "@/lib/auth/guards";
import {
  crearAuditGlobal,
  listarAuditGlobal,
  facetasAuditGlobal,
  type CrearAuditInput,
} from "@/repositories/audit.repository";

export interface AuditDTO {
  id: string;
  actorRol: string;
  accion: string;
  entidad: string;
  entidadId: string;
  escuelaId: string | null;
  motivo: string | null;
  createdAt: string;
}

/** Registra una acción sensible (Sección 6.7). */
export async function registrarAuditoria(
  ctx: AuthContext,
  input: Omit<CrearAuditInput, "actorId" | "actorRol">,
): Promise<void> {
  await crearAuditGlobal({
    actorId: ctx.userId,
    actorRol: ctx.rol,
    ...input,
  });
}

export interface FiltrosAuditoria {
  escuelaId?: string;
  accion?: string;
  entidad?: string;
  actorRol?: string;
  /** Fechas en formato "yyyy-MM-dd" (las envía el form de la vista). */
  desde?: string;
  hasta?: string;
  pagina?: number;
  porPagina?: number;
}

/**
 * "yyyy-MM-dd" → Date, o undefined si viene vacío/inválido. `finDelDia` lleva el
 * límite a las 23:59:59.999 para que el "hasta" incluya el día completo.
 */
function aFecha(valor: string | undefined, finDelDia = false): Date | undefined {
  if (!valor) return undefined;
  const d = new Date(`${valor}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface PaginaAuditoria {
  registros: AuditDTO[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
  facetas: { acciones: string[]; entidades: string[]; roles: string[] };
}

const POR_PAGINA_DEFAULT = 50;

/**
 * Lista el AuditLog paginado y con filtros (solo SUPER_ADMIN). Devuelve también
 * las facetas (valores distintos de acción/entidad/rol) para poblar los filtros
 * de la vista, y el total para calcular la paginación.
 */
export async function listarAuditoria(
  ctx: AuthContext,
  filtros: FiltrosAuditoria = {},
): Promise<PaginaAuditoria> {
  requirePermiso(ctx, "VER_AUDITORIA");
  const porPagina = Math.min(Math.max(1, filtros.porPagina ?? POR_PAGINA_DEFAULT), 200);
  const pagina = Math.max(1, filtros.pagina ?? 1);

  const [{ rows, total }, facetas] = await Promise.all([
    listarAuditGlobal({
      escuelaId: filtros.escuelaId,
      accion: filtros.accion,
      entidad: filtros.entidad,
      actorRol: filtros.actorRol,
      desde: aFecha(filtros.desde),
      hasta: aFecha(filtros.hasta, true),
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    facetasAuditGlobal(),
  ]);

  return {
    registros: rows.map((r) => ({
      id: r.id,
      actorRol: r.actorRol,
      accion: r.accion,
      entidad: r.entidad,
      entidadId: r.entidadId,
      escuelaId: r.escuelaId,
      motivo: r.motivo,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    facetas,
  };
}
