import { describe, it, expect } from "vitest";
import { POSICIONES } from "@/types";
import {
  GRUPOS,
  construirLayoutParametros,
  FILA_GRUPOS_DESDE,
  FILA_GRUPOS_HASTA,
  FILA_POS_TITULO,
  FILA_POS_CABECERA,
  FILA_POSICIONES_DESDE,
  FILA_POSICIONES_HASTA,
  FILA_ESCALARES_DESDE,
} from "@/lib/plantilla-simulador-layout";

// `construirLayoutParametros` (Fase B) generaliza el layout de la hoja
// "Parametros" de la planilla del simulador: en vez de calcularse siempre a
// partir de GRUPOS (5 franjas etarias fijas), ahora depende de la CANTIDAD de
// "filas de grupo" que se le pasen — en modo escuela son las categorías
// reales. Este test fija que, con GRUPOS, la función da EXACTAMENTE el mismo
// layout que las constantes hardcodeadas de hoy (guardarrail de no-regresión
// para `tests/unit/plantilla-simulador.test.ts`), y que el cálculo escala
// correctamente con otras cantidades de filas.

describe("construirLayoutParametros", () => {
  it("con GRUPOS (5 elementos) da EXACTAMENTE los mismos números de fila que las constantes hardcodeadas de hoy", () => {
    const layout = construirLayoutParametros(GRUPOS);
    expect(layout).toEqual({
      filaGruposDesde: FILA_GRUPOS_DESDE,
      filaGruposHasta: FILA_GRUPOS_HASTA,
      filaPosTitulo: FILA_POS_TITULO,
      filaPosCabecera: FILA_POS_CABECERA,
      filaPosicionesDesde: FILA_POSICIONES_DESDE,
      filaPosicionesHasta: FILA_POSICIONES_HASTA,
      filaEscalaresDesde: FILA_ESCALARES_DESDE,
    });
  });

  it("el ancho del rango de grupos = la cantidad de filas de grupo dadas", () => {
    const layout3 = construirLayoutParametros(["A", "B", "C"]);
    expect(layout3.filaGruposHasta - layout3.filaGruposDesde + 1).toBe(3);

    const layout1 = construirLayoutParametros(["única"]);
    expect(layout1.filaGruposHasta - layout1.filaGruposDesde + 1).toBe(1);
  });

  it("el rango de posiciones sigue teniendo tantas filas como POSICIONES, sin importar la cantidad de filas de grupo", () => {
    const layout = construirLayoutParametros(["cat-1", "cat-2"]);
    expect(layout.filaPosicionesHasta - layout.filaPosicionesDesde + 1).toBe(
      POSICIONES.length,
    );
  });

  it("cada bloque arranca 2 filas después de que termina el anterior, para cualquier cantidad de filas de grupo", () => {
    const layout = construirLayoutParametros(["x", "y", "z", "w"]);
    expect(layout.filaPosTitulo).toBe(layout.filaGruposHasta + 2);
    expect(layout.filaPosCabecera).toBe(layout.filaPosTitulo + 1);
    expect(layout.filaPosicionesDesde).toBe(layout.filaPosCabecera + 1);
    expect(layout.filaEscalaresDesde).toBe(layout.filaPosicionesHasta + 3);
  });

  it("con menos filas de grupo (categorías) que GRUPOS, el resto del layout se corre hacia arriba", () => {
    const layoutGlobal = construirLayoutParametros(GRUPOS); // 5
    const layoutCategoria = construirLayoutParametros(["Sub-12", "Sub-14"]); // 2
    expect(layoutCategoria.filaGruposHasta).toBeLessThan(layoutGlobal.filaGruposHasta);
    expect(layoutCategoria.filaEscalaresDesde).toBeLessThan(layoutGlobal.filaEscalaresDesde);
  });
});
