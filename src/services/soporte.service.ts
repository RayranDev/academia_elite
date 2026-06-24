import type { AuthContext } from "@/lib/auth/context";
import { requirePermiso } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  sesionActivaDe,
  cerrarSesionesAbiertas,
  crearSesion,
  finalizarSesion,
  habilitarEscritura,
} from "@/repositories/soporte.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";

// Modo soporte (ROL-SUPER-ADMIN.md M2): puerta explícita, temporal y auditada por
// la que el SUPER_ADMIN accede a los datos operativos de una escuela.

export interface SoporteSesionDTO {
  sesionId: string;
  escuelaId: string;
  escuelaNombre: string;
  motivo: string;
  soloLectura: boolean;
}

/** Sesión de soporte activa del SA (con nombre de escuela), para el banner. */
export async function obtenerSesionSoporteActual(
  ctx: AuthContext,
): Promise<SoporteSesionDTO | null> {
  if (ctx.rol !== "SUPER_ADMIN") return null;
  const sesion = await sesionActivaDe(ctx.userId);
  if (!sesion) return null;
  const escuela = await obtenerEscuela(sesion.escuelaId);
  return {
    sesionId: sesion.id,
    escuelaId: sesion.escuelaId,
    escuelaNombre: escuela?.nombre ?? "Escuela",
    motivo: sesion.motivo,
    soloLectura: sesion.soloLectura,
  };
}

/**
 * Inicia una sesión de soporte sobre una escuela. Cierra cualquier sesión previa
 * del mismo SA (solo una activa a la vez) y la deja registrada en AuditLog.
 */
export async function iniciarSoporte(
  ctx: AuthContext,
  input: { escuelaId: string; motivo: string; soloLectura: boolean },
): Promise<void> {
  requirePermiso(ctx, "SOPORTE_TENANT");
  const motivo = input.motivo.trim();
  if (!motivo) throw new ValidationError("El soporte requiere un motivo.");
  const escuela = await obtenerEscuela(input.escuelaId);
  if (!escuela) throw new NotFoundError("Escuela no encontrada.");

  await cerrarSesionesAbiertas(ctx.userId);
  const sesion = await crearSesion({
    superAdminId: ctx.userId,
    escuelaId: input.escuelaId,
    motivo,
    soloLectura: input.soloLectura,
  });
  await registrarAuditoria(ctx, {
    accion: "INICIAR_SOPORTE",
    entidad: "SoporteSesion",
    entidadId: sesion.id,
    escuelaId: input.escuelaId,
    motivo,
  });
}

/** Finaliza la sesión de soporte activa del SA (auditado). */
export async function finalizarSoporte(ctx: AuthContext): Promise<void> {
  requirePermiso(ctx, "SOPORTE_TENANT");
  const sesion = await sesionActivaDe(ctx.userId);
  if (!sesion) return;
  await finalizarSesion(sesion.id, ctx.userId);
  await registrarAuditoria(ctx, {
    accion: "FINALIZAR_SOPORTE",
    entidad: "SoporteSesion",
    entidadId: sesion.id,
    escuelaId: sesion.escuelaId,
    motivo: sesion.motivo,
  });
}

/**
 * Pasa la sesión activa de solo-lectura a escritura. Es una acción consciente y
 * auditada (no un toggle silencioso): requiere un motivo y crea su propia entrada.
 */
export async function habilitarEscrituraSoporte(
  ctx: AuthContext,
  motivo: string,
): Promise<void> {
  requirePermiso(ctx, "SOPORTE_TENANT");
  const razon = motivo.trim();
  if (!razon) throw new ValidationError("El soporte requiere un motivo.");
  const sesion = await sesionActivaDe(ctx.userId);
  if (!sesion) throw new ValidationError("No hay una sesión de soporte activa.");
  await habilitarEscritura(sesion.id, ctx.userId);
  await registrarAuditoria(ctx, {
    accion: "SOPORTE_HABILITA_ESCRITURA",
    entidad: "SoporteSesion",
    entidadId: sesion.id,
    escuelaId: sesion.escuelaId,
    motivo: razon,
  });
}
