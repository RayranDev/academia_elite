import { describe, it, expect } from "vitest";
import {
  nivelPorOvr,
  umbralesDesdeParametros,
  UMBRALES_DEFECTO,
} from "@/lib/stats-engine";

describe("nivelPorOvr", () => {
  it("usa los umbrales por defecto (65/75/85)", () => {
    expect(nivelPorOvr(64)).toBe("BRONCE");
    expect(nivelPorOvr(65)).toBe("PLATA");
    expect(nivelPorOvr(74)).toBe("PLATA");
    expect(nivelPorOvr(75)).toBe("ORO");
    expect(nivelPorOvr(85)).toBe("HEROE");
  });

  it("respeta umbrales personalizados", () => {
    const u = { plata: 60, oro: 72, heroe: 90 };
    expect(nivelPorOvr(60, u)).toBe("PLATA");
    expect(nivelPorOvr(72, u)).toBe("ORO");
    expect(nivelPorOvr(89, u)).toBe("ORO");
    expect(nivelPorOvr(90, u)).toBe("HEROE");
  });
});

describe("umbralesDesdeParametros", () => {
  it("lee las claves UMBRAL_* y cae al defecto si faltan", () => {
    expect(umbralesDesdeParametros({})).toEqual(UMBRALES_DEFECTO);
    expect(
      umbralesDesdeParametros({ UMBRAL_PLATA: 60, UMBRAL_ORO: 72, UMBRAL_HEROE: 90 }),
    ).toEqual({ plata: 60, oro: 72, heroe: 90 });
  });

  it("cae al defecto si el orden es incoherente", () => {
    expect(
      umbralesDesdeParametros({ UMBRAL_PLATA: 80, UMBRAL_ORO: 70, UMBRAL_HEROE: 90 }),
    ).toEqual(UMBRALES_DEFECTO);
  });
});
