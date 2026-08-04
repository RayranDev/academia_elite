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
 * de la longitud real de `GRUPOS`/`POSICIONES`. Cada bloque arranca 2 filas
 * después de que termina el anterior (fila en blanco + encabezado); con los
 * arrays de hoy da el layout ya conocido (grupos 2-6, posiciones 10-13,
 * escalares 16-19).
 */
export const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10", "SUB12", "SUB14", "SUB16"];

export const FILA_GRUPOS_DESDE = 2;
export const FILA_GRUPOS_HASTA = FILA_GRUPOS_DESDE + GRUPOS.length - 1;
export const FILA_POS_TITULO = FILA_GRUPOS_HASTA + 2;
export const FILA_POS_CABECERA = FILA_POS_TITULO + 1;
export const FILA_POSICIONES_DESDE = FILA_POS_CABECERA + 1;
export const FILA_POSICIONES_HASTA = FILA_POSICIONES_DESDE + POSICIONES.length - 1;
export const FILA_ESCALARES_DESDE = FILA_POSICIONES_HASTA + 3;
