import type { AuthContext } from "@/lib/auth/context";
import {
  requirePermiso,
  assertTenant,
  assertSoportePuedeEscribir,
  assertMotivoSoporte,
} from "@/lib/auth/guards";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { listarParametrosPorPrefijo } from "@/repositories/parametro.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
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
import { CURVA, type Curva } from "@/lib/curva";

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

/**
 * Métricas de una escuela: global + override por clave (rangos y umbrales).
 * Exclusivo del SUPER_ADMIN; la escuela se selecciona explícitamente (la lógica
 * de evaluación la gestionamos nosotros, no las escuelas).
 */
export async function listarMetricasEscuelaAdmin(
  ctx: AuthContext,
  escuelaId: string,
): Promise<MetricasEscuelaDTO> {
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
  // `requirePermiso` responde QUÉ puede hacer en la plataforma, no A QUÉ TENANT
  // puede entrar: el `escuelaId` llega del request (mismo criterio que
  // `obtenerConfigSimuladorEscuela` en parametro.service.ts — el guard va acá,
  // en el punto de paso, AGENTS.md §5).
  assertTenant(ctx, escuelaId);
  if (!(await obtenerEscuela(escuelaId))) {
    throw new NotFoundError("Escuela no encontrada.");
  }
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
  if (clave.startsWith("CURVA_")) {
    if (valor < 0) throw new ValidationError("El valor no puede ser negativo.");
    if (clave === "CURVA_UMBRAL_AUSENCIAS" && !Number.isInteger(valor)) {
      throw new ValidationError("El umbral de ausencias debe ser un número entero.");
    }
    return;
  }
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

/**
 * Fija un override de métrica para una escuela (SUPER_ADMIN, en sesión de
 * soporte). Auditado con el motivo de la sesión (capturado una vez al
 * abrirla, mismo patrón que `editarJugador`/`actualizarFichaMedica` en
 * `gestion-jugadores.service.ts`).
 */
export async function fijarMetricaEscuelaAdmin(
  ctx: AuthContext,
  escuelaId: string,
  clave: string,
  valor: number,
  motivo?: string,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
  assertTenant(ctx, escuelaId);
  if (!(await obtenerEscuela(escuelaId))) {
    throw new NotFoundError("Escuela no encontrada.");
  }
  if (!claveOverrideable(clave)) {
    throw new ValidationError("Esa métrica no se puede configurar por escuela.");
  }
  if (!Number.isFinite(valor)) throw new ValidationError("Valor inválido.");
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);

  const { global, override } = await cargarValores(escuelaId);
  const efectivo = mezclarParametros(global, override);
  validarCoherencia(clave, valor, efectivo);

  await upsertOverride(escuelaId, clave, valor);
  await registrarAuditoria(ctx, {
    accion: "CAMBIO_PARAMETRO_ESCUELA",
    entidad: "ParametroEscuela",
    entidadId: clave,
    escuelaId,
    motivo: motivo ? `${clave} → ${valor} (${motivo})` : `${clave} → ${valor}`,
  });
}

/**
 * Quita el override de una escuela (vuelve al valor global). Auditado, mismo
 * criterio de sesión de soporte que `fijarMetricaEscuelaAdmin`.
 */
export async function quitarMetricaEscuelaAdmin(
  ctx: AuthContext,
  escuelaId: string,
  clave: string,
  motivo?: string,
): Promise<void> {
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
  assertTenant(ctx, escuelaId);
  if (!(await obtenerEscuela(escuelaId))) {
    throw new NotFoundError("Escuela no encontrada.");
  }
  if (!claveOverrideable(clave)) {
    throw new ValidationError("Esa métrica no se puede configurar por escuela.");
  }
  assertMotivoSoporte(ctx, motivo);
  assertSoportePuedeEscribir(ctx);
  await eliminarOverride(escuelaId, clave);
  await registrarAuditoria(ctx, {
    accion: "QUITAR_PARAMETRO_ESCUELA",
    entidad: "ParametroEscuela",
    entidadId: clave,
    escuelaId,
    motivo: motivo ? `${clave} (${motivo})` : clave,
  });
}

/** Valores efectivos (global + override) de una escuela, para el motor. */
export async function resolverParametrosEscuela(
  escuelaId: string,
): Promise<Record<string, number>> {
  const { global, override } = await cargarValores(escuelaId);
  return mezclarParametros(global, override);
}

/** Solo las 5 constantes de la curva de desarrollo overrideables por escuela. */
const CLAVES_CURVA_OVERRIDEABLE = [
  "CURVA_GANANCIA_ENTRENO",
  "CURVA_GANANCIA_PARTIDO",
  "CURVA_TOPE_MEN_BONUS",
  "CURVA_TOPE_RENDIMIENTO_BONUS",
  "CURVA_UMBRAL_AUSENCIAS",
] as const;

/** Default embebido de las 5 claves de curva overrideables (fallback si no están sembradas). */
const DEFECTO_CURVA: Record<string, number> = {
  CURVA_GANANCIA_ENTRENO: CURVA.GANANCIA_ENTRENO,
  CURVA_GANANCIA_PARTIDO: CURVA.GANANCIA_PARTIDO,
  CURVA_TOPE_MEN_BONUS: CURVA.TOPE_MEN_BONUS,
  CURVA_TOPE_RENDIMIENTO_BONUS: CURVA.TOPE_RENDIMIENTO_BONUS,
  CURVA_UMBRAL_AUSENCIAS: CURVA.UMBRAL_AUSENCIAS,
};

async function cargarValoresCurva(escuelaId: string): Promise<{
  global: Record<string, number>;
  override: Record<string, number>;
}> {
  const [curvaGlobal, overrides] = await Promise.all([
    listarParametrosPorPrefijo("CURVA_"),
    listarOverrides(escuelaId),
  ]);
  const dbGlobal = Object.fromEntries(curvaGlobal.map((p) => [p.clave, p.valor]));
  return {
    global: { ...DEFECTO_CURVA, ...dbGlobal },
    override: Object.fromEntries(overrides.map((o) => [o.clave, o.valor])),
  };
}

/** Filas para la UI del SUPER_ADMIN (panel /admin/parametros, modo escuela). */
export async function listarMetricasCurvaEscuelaAdmin(
  ctx: AuthContext,
  escuelaId: string,
): Promise<FilaParametro[]> {
  requirePermiso(ctx, "EDITAR_PARAMETROS_GLOBALES");
  // Mismo criterio que `listarMetricasEscuelaAdmin`: el escuelaId llega del
  // request, el guard de tenant va acá (AGENTS.md §5).
  assertTenant(ctx, escuelaId);
  if (!(await obtenerEscuela(escuelaId))) throw new NotFoundError("Escuela no encontrada.");
  const { global, override } = await cargarValoresCurva(escuelaId);
  return resolverParametros([...CLAVES_CURVA_OVERRIDEABLE], global, override);
}

/**
 * Objeto CURVA completo (10 keys) con los 5 overrideables resueltos para esta
 * escuela — para el cron y cualquier cálculo per-escuela. Las otras 5 quedan
 * en su valor hardcodeado (nunca son overrideables por escuela).
 */
export async function resolverCurvaEscuela(escuelaId: string): Promise<Curva> {
  const { global, override } = await cargarValoresCurva(escuelaId);
  const efectivo = mezclarParametros(global, override);
  return {
    ...CURVA,
    GANANCIA_ENTRENO: efectivo.CURVA_GANANCIA_ENTRENO,
    GANANCIA_PARTIDO: efectivo.CURVA_GANANCIA_PARTIDO,
    TOPE_MEN_BONUS: efectivo.CURVA_TOPE_MEN_BONUS,
    TOPE_RENDIMIENTO_BONUS: efectivo.CURVA_TOPE_RENDIMIENTO_BONUS,
    UMBRAL_AUSENCIAS: efectivo.CURVA_UMBRAL_AUSENCIAS,
  };
}
