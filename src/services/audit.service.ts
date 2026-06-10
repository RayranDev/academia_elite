import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import {
  crearAuditGlobal,
  listarAuditGlobal,
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

/** Lista el AuditLog (solo SUPER_ADMIN; opcional filtrar por escuela). */
export async function listarAuditoria(
  ctx: AuthContext,
  filtros: { escuelaId?: string } = {},
): Promise<AuditDTO[]> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const rows = await listarAuditGlobal(filtros);
  return rows.map((r) => ({
    id: r.id,
    actorRol: r.actorRol,
    accion: r.accion,
    entidad: r.entidad,
    entidadId: r.entidadId,
    escuelaId: r.escuelaId,
    motivo: r.motivo,
    createdAt: r.createdAt.toISOString(),
  }));
}
