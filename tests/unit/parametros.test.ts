import { describe, it, expect } from "vitest";
import {
  claveOverrideable,
  mezclarParametros,
  resolverParametros,
} from "@/lib/parametros";

describe("claveOverrideable", () => {
  it("permite RANGO_* y UMBRAL_*", () => {
    expect(claveOverrideable("RANGO_SPRINT_SUB12_MIN")).toBe(true);
    expect(claveOverrideable("UMBRAL_ORO")).toBe(true);
  });
  it("NO permite PESO_MEN_EN_OVR (queda global)", () => {
    expect(claveOverrideable("PESO_MEN_EN_OVR")).toBe(false);
  });
});

describe("mezclarParametros", () => {
  it("el override gana solo en claves overrideables", () => {
    const global = { UMBRAL_ORO: 75, PESO_MEN_EN_OVR: 0.1 };
    const override = { UMBRAL_ORO: 70, PESO_MEN_EN_OVR: 0.5 };
    const merged = mezclarParametros(global, override);
    expect(merged.UMBRAL_ORO).toBe(70);
    expect(merged.PESO_MEN_EN_OVR).toBe(0.1); // no overrideable
  });
});

describe("resolverParametros", () => {
  it("marca el origen correcto por clave", () => {
    const global = { UMBRAL_PLATA: 65, UMBRAL_ORO: 75 };
    const override = { UMBRAL_PLATA: 60 };
    const [plata, oro, heroe] = resolverParametros(
      ["UMBRAL_PLATA", "UMBRAL_ORO", "UMBRAL_HEROE"],
      global,
      override,
    );
    expect(plata).toMatchObject({ valorEfectivo: 60, origen: "escuela", valorGlobal: 65 });
    expect(oro).toMatchObject({ valorEfectivo: 75, origen: "global" });
    expect(heroe).toMatchObject({ valorEfectivo: null, origen: "defecto" });
  });
});
