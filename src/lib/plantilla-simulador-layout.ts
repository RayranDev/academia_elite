import { POSICIONES } from "@/types";
import type { GrupoEdad } from "@/lib/stats-engine";

/**
 * Layout de la hoja "Parametros" de la planilla del simulador (Excel). Puro y
 * testeable: mismas entradas → mismas salidas, sin Prisma ni ExcelJS.
 *
 * Los rangos de los lookups de las fórmulas ($A$2:$A$6, $A$10:$A$13) eran
 * literales fijos: sumar un GrupoEdad o una Posicion nueva compilaba igual y
 * la planilla quedaba mal en silencio — mismo modo de falla que ya se cerró
 * para `COLUMNA_MEDIDA` en `plantilla-simulador.service.ts`. Acá se derivan
 * de la CANTIDAD de "filas de grupo" (`construirLayoutParametros`), no de que
 * sean `GrupoEdad` específicamente: desde Fase B el modo escuela usa
 * categorías reales en vez de grupos de edad fijos, y el cálculo de filas es
 * el mismo, solo cambia cuántas filas de grupo hay. Cada bloque arranca 2
 * filas después de que termina el anterior (fila en blanco + encabezado).
 */
export const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10", "SUB12", "SUB14", "SUB16"];

export interface LayoutParametros {
  filaGruposDesde: number;
  filaGruposHasta: number;
  filaPosTitulo: number;
  filaPosCabecera: number;
  filaPosicionesDesde: number;
  filaPosicionesHasta: number;
  filaEscalaresDesde: number;
}

/**
 * Calcula el layout a partir de la CANTIDAD de filas de grupo (grupos de edad
 * en modo global, categorías en modo escuela). Pura.
 */
export function construirLayoutParametros(filasGrupo: unknown[]): LayoutParametros {
  const filaGruposDesde = 2;
  const filaGruposHasta = filaGruposDesde + filasGrupo.length - 1;
  const filaPosTitulo = filaGruposHasta + 2;
  const filaPosCabecera = filaPosTitulo + 1;
  const filaPosicionesDesde = filaPosCabecera + 1;
  const filaPosicionesHasta = filaPosicionesDesde + POSICIONES.length - 1;
  const filaEscalaresDesde = filaPosicionesHasta + 3;
  return {
    filaGruposDesde,
    filaGruposHasta,
    filaPosTitulo,
    filaPosCabecera,
    filaPosicionesDesde,
    filaPosicionesHasta,
    filaEscalaresDesde,
  };
}

// Constantes derivadas para el modo GLOBAL (compat con los consumidores que ya
// las importaban por nombre; con los 5 GRUPOS de hoy dan el layout ya
// conocido: grupos 2-6, posiciones 10-13, escalares 16-19).
const LAYOUT_GLOBAL = construirLayoutParametros(GRUPOS);
export const FILA_GRUPOS_DESDE = LAYOUT_GLOBAL.filaGruposDesde;
export const FILA_GRUPOS_HASTA = LAYOUT_GLOBAL.filaGruposHasta;
export const FILA_POS_TITULO = LAYOUT_GLOBAL.filaPosTitulo;
export const FILA_POS_CABECERA = LAYOUT_GLOBAL.filaPosCabecera;
export const FILA_POSICIONES_DESDE = LAYOUT_GLOBAL.filaPosicionesDesde;
export const FILA_POSICIONES_HASTA = LAYOUT_GLOBAL.filaPosicionesHasta;
export const FILA_ESCALARES_DESDE = LAYOUT_GLOBAL.filaEscalaresDesde;
