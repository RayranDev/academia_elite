import { describe, it, expect } from "vitest";
import {
  nivelAlcanza,
  fondoDesbloqueado,
  requisitoTexto,
  type EstadoMeritos,
} from "@/lib/fondos";

const base: EstadoMeritos = {
  logros: new Set(["CAPITAN_VESTUARIO"]),
  nivelCarta: "ORO",
  nivelPersonal: 4,
};

describe("nivelAlcanza", () => {
  it("compara el orden de niveles", () => {
    expect(nivelAlcanza("ORO", "PLATA")).toBe(true);
    expect(nivelAlcanza("PLATA", "ORO")).toBe(false);
    expect(nivelAlcanza("HEROE", "HEROE")).toBe(true);
    expect(nivelAlcanza(null, "PLATA")).toBe(false); // null = Bronce
  });
});

describe("fondoDesbloqueado", () => {
  it("SIEMPRE siempre está disponible", () => {
    expect(fondoDesbloqueado({ requisitoTipo: "SIEMPRE", requisitoValor: null }, base)).toBe(true);
  });
  it("LOGRO requiere tener el código", () => {
    expect(fondoDesbloqueado({ requisitoTipo: "LOGRO", requisitoValor: "CAPITAN_VESTUARIO" }, base)).toBe(true);
    expect(fondoDesbloqueado({ requisitoTipo: "LOGRO", requisitoValor: "OTRO" }, base)).toBe(false);
  });
  it("NIVEL_CARTA exige nivel suficiente", () => {
    expect(fondoDesbloqueado({ requisitoTipo: "NIVEL_CARTA", requisitoValor: "PLATA" }, base)).toBe(true);
    expect(fondoDesbloqueado({ requisitoTipo: "NIVEL_CARTA", requisitoValor: "HEROE" }, base)).toBe(false);
  });
  it("NIVEL_PERSONAL exige nivel mínimo", () => {
    expect(fondoDesbloqueado({ requisitoTipo: "NIVEL_PERSONAL", requisitoValor: "3" }, base)).toBe(true);
    expect(fondoDesbloqueado({ requisitoTipo: "NIVEL_PERSONAL", requisitoValor: "5" }, base)).toBe(false);
  });
});

describe("requisitoTexto", () => {
  it("describe el requisito en español", () => {
    expect(requisitoTexto({ requisitoTipo: "SIEMPRE", requisitoValor: null })).toMatch(/todos/i);
    expect(requisitoTexto({ requisitoTipo: "NIVEL_CARTA", requisitoValor: "ORO" })).toMatch(/Oro/);
    expect(requisitoTexto({ requisitoTipo: "LOGRO", requisitoValor: "X" }, "Capitán")).toMatch(/Capitán/);
  });
});
