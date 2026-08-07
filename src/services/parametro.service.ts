import type { AuthContext } from "@/lib/auth/context";
import { requirePermiso, assertTenant } from "@/lib/auth/guards";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  listarParametrosGlobal,
  obtenerParametroGlobal,
  actualizarParametroGlobal,
  listarParametrosPorPrefijo,
} from "@/repositories/parametro.repository";
import { registrarAuditoria } from "@/services/audit.service";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import { listarRangosDeEscuela } from "@/repositories/categoria-rango.repository";
import { resolverParametrosEscuela } from "@/services/parametro-escuela.service";
import {
  rangosDesdeParametros,
  rangosDesdeFila,
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

export interface ConfigSimuladorCategoria {
  categorias: { id: string; nombre: string; rangos: RangosFisicos }[];
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
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
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
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
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
 * Igual que `obtenerConfigSimulador` pero con la calibración física real de
 * cada CATEGORÍA de la escuela (Fase B, reemplaza el modo "por GrupoEdad" que
 * tenía `obtenerConfigSimuladorEscuela`). Los umbrales siguen resolviéndose
 * global + overrides de la escuela; el peso de MEN se mantiene global (no es
 * overrideable por escuela). Solo SUPER_ADMIN.
 */
export async function obtenerConfigSimuladorCategoria(
  ctx: AuthContext,
  escuelaId: string,
): Promise<ConfigSimuladorCategoria> {
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
  // `requirePermiso` responde QUÉ puede hacer en la plataforma, no A QUÉ TENANT
  // puede entrar: el `escuelaId` llega del request en los dos llamadores (la
  // página `/admin/simulador?escuela=` y la descarga de la planilla). El guard va
  // ACÁ, en el punto de paso, y no en cada consumidor — puesto arriba cerraba una
  // puerta y dejaba la otra abierta, que es lo que pasó (AGENTS.md §5: la
  // seguridad real vive en los servicios).
  assertTenant(ctx, escuelaId);
  if (!(await obtenerEscuela(escuelaId))) {
    throw new NotFoundError("Escuela no encontrada.");
  }
  const [filas, valoresUmbral, paramMen] = await Promise.all([
    listarRangosDeEscuela(escuelaId),
    resolverParametrosEscuela(escuelaId),
    obtenerParametroGlobal("PESO_MEN_EN_OVR"),
  ]);
  return {
    // Solo aparecen las categorías que ya tienen `CategoriaRangoFisico`
    // (todas las creadas desde la Fase B; las anteriores requieren el
    // backfill — ver `scripts/backfill-categoria-rangos.ts`).
    categorias: filas.map((f) => ({
      id: f.categoriaId,
      nombre: f.categoria.nombre,
      rangos: rangosDesdeFila(f),
    })),
    pesoMen: paramMen?.valor ?? 0.1,
    umbrales: umbralesDesdeParametros(valoresUmbral),
  };
}

/** Actualiza un parámetro de fórmula. Queda auditado (solo afecta a evals futuras). */
export async function actualizarParametro(
  ctx: AuthContext,
  clave: string,
  valor: number,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
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
