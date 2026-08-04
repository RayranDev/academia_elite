import { describe, it, expect } from "vitest";
import { POSICIONES } from "@/types";
import {
  GRUPOS,
  FILA_GRUPOS_DESDE,
  FILA_GRUPOS_HASTA,
  FILA_POS_TITULO,
  FILA_POS_CABECERA,
  FILA_POSICIONES_DESDE,
  FILA_POSICIONES_HASTA,
  FILA_ESCALARES_DESDE,
} from "@/lib/plantilla-simulador-layout";

// Layout de la hoja "Parametros" de la planilla del simulador (Excel). El bug
// que esto cierra: los rangos de los lookups de las fórmulas eran literales
// fijos ($A$2:$A$6, $A$10:$A$13) — agregar un GrupoEdad o una Posicion nueva
// compilaba igual y la planilla quedaba mal en silencio. Estos tests fijan
// tanto la relación derivada (ancho de rango = longitud del array) como el
// layout numérico concreto de hoy, para que romper cualquiera de las dos cosas
// falle acá y no en un Excel generado.

describe("layout de la hoja Parametros (plantilla del simulador)", () => {
  it("el rango de grupos tiene tantas filas como GRUPOS", () => {
    expect(FILA_GRUPOS_HASTA - FILA_GRUPOS_DESDE + 1).toBe(GRUPOS.length);
  });

  it("el rango de posiciones tiene tantas filas como POSICIONES", () => {
    expect(FILA_POSICIONES_HASTA - FILA_POSICIONES_DESDE + 1).toBe(
      POSICIONES.length,
    );
  });

  it("cada bloque arranca 2 filas después de que termina el anterior", () => {
    expect(FILA_POS_TITULO).toBe(FILA_GRUPOS_HASTA + 2);
    expect(FILA_POS_CABECERA).toBe(FILA_POS_TITULO + 1);
    expect(FILA_POSICIONES_DESDE).toBe(FILA_POS_CABECERA + 1);
    expect(FILA_ESCALARES_DESDE).toBe(FILA_POSICIONES_HASTA + 3);
  });

  it("layout concreto de hoy: 5 grupos y 4 posiciones dan las filas ya conocidas", () => {
    expect(GRUPOS.length).toBe(5);
    expect(POSICIONES.length).toBe(4);
    expect(FILA_GRUPOS_DESDE).toBe(2);
    expect(FILA_GRUPOS_HASTA).toBe(6);
    expect(FILA_POS_TITULO).toBe(8);
    expect(FILA_POS_CABECERA).toBe(9);
    expect(FILA_POSICIONES_DESDE).toBe(10);
    expect(FILA_POSICIONES_HASTA).toBe(13);
    expect(FILA_ESCALARES_DESDE).toBe(16);
  });
});
