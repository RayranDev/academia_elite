import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  listarParametrosGlobal,
  obtenerParametroGlobal,
  actualizarParametroGlobal,
} from "@/repositories/parametro.repository";
import { registrarAuditoria } from "@/services/audit.service";

export interface ParametroDTO {
  clave: string;
  valor: number;
  descripcion: string | null;
  updatedAt: string;
}

export async function listarParametros(
  ctx: AuthContext,
): Promise<ParametroDTO[]> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const rows = await listarParametrosGlobal();
  return rows.map((p) => ({
    clave: p.clave,
    valor: p.valor,
    descripcion: p.descripcion,
    updatedAt: p.updatedAt.toISOString(),
  }));
}

/** Actualiza un parámetro de fórmula. Queda auditado (solo afecta a evals futuras). */
export async function actualizarParametro(
  ctx: AuthContext,
  clave: string,
  valor: number,
): Promise<void> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const actual = await obtenerParametroGlobal(clave);
  if (!actual) throw new NotFoundError("Parámetro no encontrado.");
  await actualizarParametroGlobal(clave, valor);
  await registrarAuditoria(ctx, {
    accion: "CAMBIO_PARAMETRO_FORMULA",
    entidad: "ParametroFormula",
    entidadId: clave,
    motivo: `${actual.valor} → ${valor}`,
  });
}
