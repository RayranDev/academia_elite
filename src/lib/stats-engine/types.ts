import type { Posicion, Nivel, StatCarta } from "@/types";
import type { UmbralesNivel } from "./levels";

export const VERSION_FORMULA = "v1.1";

export type GrupoEdad = "SUB8" | "SUB10" | "SUB12" | "SUB14" | "SUB16";

/** Medidas crudas de una evaluación (4 físicas + 4 técnicas + 4 mentalidad). */
export interface MedidasEvaluacion {
  // Físicas (medidas reales)
  sprint30mSeg: number;
  saltoVerticalCm: number;
  agilidadIllinoisSeg: number;
  resistenciaYoyoNivel: number;
  // Técnicas (nota 1-10)
  controlBalon: number;
  pase: number;
  tiro: number;
  regate: number;
  // Mentalidad (nota 1-10)
  actitud: number;
  concentracion: number;
  trabajoEquipo: number;
  resiliencia: number;
}

/** Rango de una prueba física por grupo de edad. `inverso`: menos = mejor. */
export interface RangoFisico {
  min: number;
  max: number;
  inverso: boolean;
}

export interface RangosFisicos {
  sprint30mSeg: RangoFisico;
  saltoVerticalCm: RangoFisico;
  agilidadIllinoisSeg: RangoFisico;
  resistenciaYoyoNivel: RangoFisico;
}

export type StatsBase = Record<Lowercase<StatCarta>, number>;

/** Bonus de logro a aplicar sobre un stat concreto (o MEN). */
export interface BonusLogro {
  stat: StatCarta | "MEN";
  valor: number;
}

export interface ResultadoStats {
  rit: number;
  tir: number;
  pas: number;
  reg: number;
  def: number;
  fis: number;
  men: number;
  ovr: number;
  nivel: Nivel;
  bonusAplicado: number;
  versionFormula: string;
}

export interface OpcionesComputo {
  posicion: Posicion;
  grupoEdad: GrupoEdad;
  pesoMenEnOvr?: number; // ParametroFormula("PESO_MEN_EN_OVR"), default 0.10
  rangos?: RangosFisicos; // override; por defecto usa los embebidos por grupo
  bonus?: BonusLogro[]; // logros BONUS sin consumir
  topeBonus?: number; // Escuela.topeBonusEntreEvals, default 3
  umbrales?: UmbralesNivel; // override de los cortes Plata/Oro/Héroe
}
