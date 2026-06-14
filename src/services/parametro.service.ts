import type { AuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarParametrosGlobal,
  obtenerParametroGlobal,
  actualizarParametroGlobal,
  listarParametrosPorPrefijo,
} from "@/repositories/parametro.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { resolverParametrosEscuela } from "@/services/parametro-escuela.service";
import {
  rangosDesdeParametros,
  umbralesDesdeParametros,
  CLAVE_UMBRAL,
  type GrupoEdad,
  type RangosFisicos,
  type UmbralesNivel,
} from "@/lib/stats-engine";

export interface ConfigSimulador {
  rangosPorGrupo: Record<GrupoEdad, RangosFisicos>;
  pesoMen: number;
  umbrales: UmbralesNivel;
}

const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10", "SUB12", "SUB14", "SUB16"];

const DESC_UMBRAL: Record<string, string> = {
  [CLAVE_UMBRAL.plata]: "OVR mínimo para nivel Plata",
  [CLAVE_UMBRAL.oro]: "OVR mínimo para nivel Oro",
  [CLAVE_UMBRAL.heroe]: "OVR mínimo para nivel Héroe",
};

/** Permite editar claves nuevas (no sembradas) si pertenecen a un grupo conocido. */
function claveEditablePermitida(clave: string): boolean {
  return (
    clave.startsWith("RANGO_") ||
    clave.startsWith("UMBRAL_") ||
    clave === "PESO_MEN_EN_OVR"
  );
}

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

/** Rangos por grupo + peso de MEN + umbrales de nivel, para el simulador (G7/M8). */
export async function obtenerConfigSimulador(
  ctx: AuthContext,
): Promise<ConfigSimulador> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  const [paramsRango, paramsUmbral, paramMen] = await Promise.all([
    listarParametrosPorPrefijo("RANGO_"),
    listarParametrosPorPrefijo("UMBRAL_"),
    obtenerParametroGlobal("PESO_MEN_EN_OVR"),
  ]);
  const valores = Object.fromEntries(paramsRango.map((p) => [p.clave, p.valor]));
  const valoresUmbral = Object.fromEntries(
    paramsUmbral.map((p) => [p.clave, p.valor]),
  );
  return {
    rangosPorGrupo: Object.fromEntries(
      GRUPOS.map((g) => [g, rangosDesdeParametros(valores, g)]),
    ) as Record<GrupoEdad, RangosFisicos>,
    pesoMen: paramMen?.valor ?? 0.1,
    umbrales: umbralesDesdeParametros(valoresUmbral),
  };
}

/**
 * Igual que `obtenerConfigSimulador` pero con los parámetros EFECTIVOS de una
 * escuela (global + sus overrides). El peso de MEN se mantiene global (no es
 * overrideable por escuela). Solo SUPER_ADMIN.
 */
export async function obtenerConfigSimuladorEscuela(
  ctx: AuthContext,
  escuelaId: string,
): Promise<ConfigSimulador> {
  requireRole(ctx, ["SUPER_ADMIN"]);
  if (!(await obtenerEscuela(escuelaId))) {
    throw new NotFoundError("Escuela no encontrada.");
  }
  const [valores, paramMen] = await Promise.all([
    resolverParametrosEscuela(escuelaId),
    obtenerParametroGlobal("PESO_MEN_EN_OVR"),
  ]);
  return {
    rangosPorGrupo: Object.fromEntries(
      GRUPOS.map((g) => [g, rangosDesdeParametros(valores, g)]),
    ) as Record<GrupoEdad, RangosFisicos>,
    pesoMen: paramMen?.valor ?? 0.1,
    umbrales: umbralesDesdeParametros(valores),
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
  // Las claves nuevas (no sembradas) solo se permiten si son de un grupo conocido.
  if (!actual && !claveEditablePermitida(clave)) {
    throw new NotFoundError("Parámetro no encontrado.");
  }
  if (clave.startsWith("UMBRAL_") && !Number.isInteger(valor)) {
    throw new ValidationError("Los umbrales deben ser enteros.");
  }
  await actualizarParametroGlobal(clave, valor, DESC_UMBRAL[clave]);
  await registrarAuditoria(ctx, {
    accion: "CAMBIO_PARAMETRO_FORMULA",
    entidad: "ParametroFormula",
    entidadId: clave,
    motivo: `${actual?.valor ?? "(nuevo)"} → ${valor}`,
  });
}
