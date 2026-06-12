// Motor de stats v1.1 — librería PURA (sin Prisma, sin React).
export { computeStats } from "./compute";
export {
  nivelPorOvr,
  umbralesDesdeParametros,
  UMBRALES_DEFECTO,
  CLAVE_UMBRAL,
  type UmbralesNivel,
} from "./levels";
export {
  normalizaFisica,
  normalizaNota,
  PISO_FISICO,
  TECHO,
} from "./normalize";
export { PESOS_POSICION, derivaStats } from "./weights";
export {
  RANGOS_POR_GRUPO,
  grupoEdadPorEdad,
  edadEnAnios,
  PRUEBAS_FISICAS,
  CLAVE_PRUEBA,
  ETIQUETA_PRUEBA,
  claveRango,
  rangosDesdeParametros,
  type PruebaFisica,
} from "./ranges";
export { VERSION_FORMULA } from "./types";
export type {
  MedidasEvaluacion,
  OpcionesComputo,
  ResultadoStats,
  GrupoEdad,
  BonusLogro,
  RangosFisicos,
} from "./types";
