import type { MedidasEvaluacion, OpcionesComputo, ResultadoStats } from "./types";
import { VERSION_FORMULA } from "./types";
import { RANGOS_POR_GRUPO } from "./ranges";
import { normalizaFisica, normalizaNota, TECHO, PISO_TECNICA } from "./normalize";
import { derivaStats, PESOS_POSICION, type MedidasNormalizadas } from "./weights";
import { nivelPorOvr } from "./levels";
import type { StatCarta } from "@/types";

const PESO_MEN_DEFECTO = 0.1;
const TOPE_BONUS_DEFECTO = 3;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function entero(v: number): number {
  return clamp(Math.round(v), PISO_TECNICA, TECHO);
}

/**
 * Calcula los stats de carta a partir de medidas crudas. Función PURA:
 * mismas entradas → mismas salidas, sin Prisma ni efectos. (Motor v1.1.)
 */
export function computeStats(
  medidas: MedidasEvaluacion,
  opts: OpcionesComputo,
): ResultadoStats {
  const rangos = opts.rangos ?? RANGOS_POR_GRUPO[opts.grupoEdad];
  const pesoMen = opts.pesoMenEnOvr ?? PESO_MEN_DEFECTO;
  const tope = opts.topeBonus ?? TOPE_BONUS_DEFECTO;

  // 1) Normalización
  const norm: MedidasNormalizadas = {
    vel: normalizaFisica(medidas.sprint30mSeg, rangos.sprint30mSeg),
    pot: normalizaFisica(medidas.saltoVerticalCm, rangos.saltoVerticalCm),
    agi: normalizaFisica(medidas.agilidadIllinoisSeg, rangos.agilidadIllinoisSeg),
    res: normalizaFisica(medidas.resistenciaYoyoNivel, rangos.resistenciaYoyoNivel),
    ctrl: normalizaNota(medidas.controlBalon),
    pasT: normalizaNota(medidas.pase),
    tirT: normalizaNota(medidas.tiro),
    regT: normalizaNota(medidas.regate),
  };

  // 2) Stats base derivados (enteros 1-99)
  const base = derivaStats(norm);
  const stats: Record<Lowercase<StatCarta>, number> = {
    rit: entero(base.rit),
    tir: entero(base.tir),
    pas: entero(base.pas),
    reg: entero(base.reg),
    def: entero(base.def),
    fis: entero(base.fis),
  };

  // 3) MEN = promedio de las 4 dimensiones de mentalidad
  let men = entero(
    (normalizaNota(medidas.actitud) +
      normalizaNota(medidas.concentracion) +
      normalizaNota(medidas.trabajoEquipo) +
      normalizaNota(medidas.resiliencia)) /
      4,
  );

  // 4) Bonus de logros (tope acumulado). Se aplica antes del OVR.
  let bonusAplicado = 0;
  for (const b of opts.bonus ?? []) {
    if (bonusAplicado >= tope) break;
    const disponible = tope - bonusAplicado;
    const aplicar = Math.min(b.valor, disponible);
    if (aplicar <= 0) continue;
    if (b.stat === "MEN") {
      men = clamp(men + aplicar, PISO_TECNICA, TECHO);
    } else {
      const k = b.stat.toLowerCase() as Lowercase<StatCarta>;
      stats[k] = clamp(stats[k] + aplicar, PISO_TECNICA, TECHO);
    }
    bonusAplicado += aplicar;
  }

  // 5) OVR = (1 - pesoMen) × (suma ponderada por posición) + pesoMen × MEN
  const w = PESOS_POSICION[opts.posicion];
  const sumaPos =
    stats.rit * w.rit +
    stats.tir * w.tir +
    stats.pas * w.pas +
    stats.reg * w.reg +
    stats.def * w.def +
    stats.fis * w.fis;
  const ovr = entero((1 - pesoMen) * sumaPos + pesoMen * men);

  return {
    ...stats,
    men,
    ovr,
    nivel: nivelPorOvr(ovr),
    bonusAplicado,
    versionFormula: VERSION_FORMULA,
  };
}
