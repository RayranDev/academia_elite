import { describe, it, expect } from "vitest";
import {
  rangosDesdeParametros,
  claveRango,
  RANGOS_POR_GRUPO,
} from "@/lib/stats-engine";

describe("claveRango", () => {
  it("compone la clave del parámetro", () => {
    expect(claveRango("sprint30mSeg", "SUB12", "MIN")).toBe("RANGO_SPRINT_SUB12_MIN");
    expect(claveRango("resistenciaYoyoNivel", "SUB8", "MAX")).toBe("RANGO_YOYO_SUB8_MAX");
  });
});

describe("rangosDesdeParametros", () => {
  it("sin valores en BD, cae al rango embebido del grupo", () => {
    const r = rangosDesdeParametros({}, "SUB12");
    expect(r).toEqual(RANGOS_POR_GRUPO.SUB12);
  });

  it("aplica los valores de BD cuando existen", () => {
    const valores = {
      RANGO_SPRINT_SUB12_MIN: 4.0,
      RANGO_SPRINT_SUB12_MAX: 6.0,
    };
    const r = rangosDesdeParametros(valores, "SUB12");
    expect(r.sprint30mSeg.min).toBe(4.0);
    expect(r.sprint30mSeg.max).toBe(6.0);
    // conserva `inverso` propio de la prueba
    expect(r.sprint30mSeg.inverso).toBe(RANGOS_POR_GRUPO.SUB12.sprint30mSeg.inverso);
    // las demás pruebas siguen con el embebido
    expect(r.saltoVerticalCm).toEqual(RANGOS_POR_GRUPO.SUB12.saltoVerticalCm);
  });

  it("si falta un extremo, solo ese cae al embebido", () => {
    const valores = { RANGO_SALTO_SUB10_MAX: 99 };
    const r = rangosDesdeParametros(valores, "SUB10");
    expect(r.saltoVerticalCm.min).toBe(RANGOS_POR_GRUPO.SUB10.saltoVerticalCm.min);
    expect(r.saltoVerticalCm.max).toBe(99);
  });
});
