import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { ValidationError } from "@/lib/errors";
import { listarParametrosPorPrefijo } from "@/repositories/parametro.repository";
import {
  listarOverrides,
  upsertOverride,
  eliminarOverride,
} from "@/repositories/parametro-escuela.repository";
import { registrarAuditoria } from "@/services/audit.service";
import {
  PRUEBAS_FISICAS,
  ETIQUETA_PRUEBA,
  RANGOS_POR_GRUPO,
  claveRango,
  CLAVE_UMBRAL,
  UMBRALES_DEFECTO,
  type GrupoEdad,
  type PruebaFisica,
} from "@/lib/stats-engine";
import {
  mezclarParametros,
  resolverParametros,
  claveOverrideable,
  type FilaParametro,
} from "@/lib/parametros";

const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10", "SUB12", "SUB14", "SUB16"];

export interface MetricaPruebaDTO {
  prueba: PruebaFisica;
  etiqueta: string;
  inverso: boolean;
  min: FilaParametro;
  max: FilaParametro;
}
export interface MetricaGrupoDTO {
  grupo: GrupoEdad;
  pruebas: MetricaPruebaDTO[];
}
export interface MetricaUmbralDTO {
  clave: string;
  etiqueta: string;
  fila: FilaParametro;
}
export interface MetricasEscuelaDTO {
  grupos: MetricaGrupoDTO[];
  umbrales: MetricaUmbralDTO[];
}

/** Mapa global con fallback embebido para TODAS las claves overrideables. */
function globalConDefecto(dbGlobal: Record<string, number>): Record<string, number> {
  const base: Record<string, number> = {};
  for (const grupo of GRUPOS) {
    for (const prueba of PRUEBAS_FISICAS) {
      const r = RANGOS_POR_GRUPO[grupo][prueba];
      base[claveRango(prueba, grupo, "MIN")] = r.min;
      base[claveRango(prueba, grupo, "MAX")] = r.max;
    }
  }
  base[CLAVE_UMBRAL.plata] = UMBRALES_DEFECTO.plata;
  base[CLAVE_UMBRAL.oro] = UMBRALES_DEFECTO.oro;
  base[CLAVE_UMBRAL.heroe] = UMBRALES_DEFECTO.heroe;
  return { ...base, ...dbGlobal };
}

async function cargarValores(escuelaId: string): Promise<{
  global: Record<string, number>;
  override: Record<string, number>;
}> {
  const [rango, umbral, overrides] = await Promise.all([
    listarParametrosPorPrefijo("RANGO_"),
    listarParametrosPorPrefijo("UMBRAL_"),
    listarOverrides(escuelaId),
  ]);
  const dbGlobal = Object.fromEntries(
    [...rango, ...umbral].map((p) => [p.clave, p.valor]),
  );
  return {
    global: globalConDefecto(dbGlobal),
    override: Object.fromEntries(overrides.map((o) => [o.clave, o.valor])),
  };
}

/** Métricas de la escuela: global + override por clave (rangos y umbrales). */
export async function listarMetricasEscuela(
  ctx: AuthContext,
): Promise<MetricasEscuelaDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const { global, override } = await cargarValores(escuelaId);

  const grupos: MetricaGrupoDTO[] = GRUPOS.map((grupo) => {
    const pruebas = PRUEBAS_FISICAS.map((prueba) => {
      const cMin = claveRango(prueba, grupo, "MIN");
      const cMax = claveRango(prueba, grupo, "MAX");
      const [min, max] = resolverParametros([cMin, cMax], global, override);
      return {
        prueba,
        etiqueta: ETIQUETA_PRUEBA[prueba],
        inverso: RANGOS_POR_GRUPO[grupo][prueba].inverso,
        min,
        max,
      };
    });
    return { grupo, pruebas };
  });

  const umbrales: MetricaUmbralDTO[] = (
    [
      [CLAVE_UMBRAL.plata, "Plata"],
      [CLAVE_UMBRAL.oro, "Oro"],
      [CLAVE_UMBRAL.heroe, "Héroe"],
    ] as const
  ).map(([clave, etiqueta]) => ({
    clave,
    etiqueta,
    fila: resolverParametros([clave], global, override)[0],
  }));

  return { grupos, umbrales };
}

/** Valida que el nuevo valor mantenga la coherencia (min<max, umbrales en orden). */
function validarCoherencia(
  clave: string,
  valor: number,
  efectivo: Record<string, number>,
): void {
  const m = { ...efectivo, [clave]: valor };
  if (clave.startsWith("UMBRAL_")) {
    if (!Number.isInteger(valor)) throw new ValidationError("Los umbrales deben ser enteros.");
    if (!(m[CLAVE_UMBRAL.plata] < m[CLAVE_UMBRAL.oro] && m[CLAVE_UMBRAL.oro] < m[CLAVE_UMBRAL.heroe])) {
      throw new ValidationError("Los umbrales deben cumplir Plata < Oro < Héroe.");
    }
    return;
  }
  // RANGO_<PRUEBA>_<GRUPO>_<MIN|MAX>: min < max numéricamente.
  const partes = clave.split("_");
  const extremo = partes[partes.length - 1];
  const baseClave = clave.slice(0, clave.length - extremo.length - 1);
  const min = extremo === "MIN" ? valor : m[`${baseClave}_MIN`];
  const max = extremo === "MAX" ? valor : m[`${baseClave}_MAX`];
  if (!(min < max)) {
    throw new ValidationError("El mínimo debe ser menor que el máximo.");
  }
}

/** Fija un override de métrica para la escuela. Auditado. */
export async function fijarMetrica(
  ctx: AuthContext,
  clave: string,
  valor: number,
): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  if (!claveOverrideable(clave)) {
    throw new ValidationError("Esa métrica no se puede configurar por escuela.");
  }
  if (!Number.isFinite(valor)) throw new ValidationError("Valor inválido.");

  const { global, override } = await cargarValores(escuelaId);
  const efectivo = mezclarParametros(global, override);
  validarCoherencia(clave, valor, efectivo);

  await upsertOverride(escuelaId, clave, valor);
  await registrarAuditoria(ctx, {
    accion: "CAMBIO_PARAMETRO_ESCUELA",
    entidad: "ParametroEscuela",
    entidadId: clave,
    escuelaId,
    motivo: `${clave} → ${valor}`,
  });
}

/** Quita el override (vuelve al valor global). Auditado. */
export async function quitarMetrica(ctx: AuthContext, clave: string): Promise<void> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  if (!claveOverrideable(clave)) {
    throw new ValidationError("Esa métrica no se puede configurar por escuela.");
  }
  await eliminarOverride(escuelaId, clave);
  await registrarAuditoria(ctx, {
    accion: "QUITAR_PARAMETRO_ESCUELA",
    entidad: "ParametroEscuela",
    entidadId: clave,
    escuelaId,
    motivo: clave,
  });
}

/** Valores efectivos (global + override) de una escuela, para el motor. */
export async function resolverParametrosEscuela(
  escuelaId: string,
): Promise<Record<string, number>> {
  const { global, override } = await cargarValores(escuelaId);
  return mezclarParametros(global, override);
}
