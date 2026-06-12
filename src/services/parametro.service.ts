import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  listarParametrosGlobal,
  obtenerParametroGlobal,
  actualizarParametroGlobal,
  listarParametrosPorPrefijo,
} from "@/repositories/parametro.repository";
import { registrarAuditoria } from "@/services/audit.service";
import {
  rangosDesdeParametros,
  type GrupoEdad,
  type RangosFisicos,
} from "@/lib/stats-engine";

const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10", "SUB12", "SUB14", "SUB16"];

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

/** Rangos por grupo (BD con fallback) + peso de MEN, para el simulador (G7). */
export async function obtenerConfigSimulador(ctx: AuthContext): Promise<{
  rangosPorGrupo: Record<GrupoEdad, RangosFisicos>;
  pesoMen: number;
}> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const [paramsRango, paramMen] = await Promise.all([
    listarParametrosPorPrefijo("RANGO_"),
    obtenerParametroGlobal("PESO_MEN_EN_OVR"),
  ]);
  const valores = Object.fromEntries(paramsRango.map((p) => [p.clave, p.valor]));
  return {
    rangosPorGrupo: Object.fromEntries(
      GRUPOS.map((g) => [g, rangosDesdeParametros(valores, g)]),
    ) as Record<GrupoEdad, RangosFisicos>,
    pesoMen: paramMen?.valor ?? 0.1,
  };
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
