import { describe, it, expect } from "vitest";
import { formatearNombre } from "@/lib/texto/formatear-nombre";

describe("formatearNombre", () => {
  it("capitaliza nombres simples sin importar el casing de entrada", () => {
    expect(formatearNombre("juan perez")).toBe("Juan Perez");
    expect(formatearNombre("JUAN PEREZ")).toBe("Juan Perez");
    expect(formatearNombre("JuAn pErEz")).toBe("Juan Perez");
  });

  it("deja partículas en minúscula salvo si encabezan", () => {
    expect(formatearNombre("de la cruz")).toBe("De la Cruz");
    expect(formatearNombre("juan de la cruz")).toBe("Juan de la Cruz");
    expect(formatearNombre("von braun")).toBe("Von Braun");
  });

  it("respeta apóstrofes y guiones", () => {
    expect(formatearNombre("o'connor")).toBe("O'Connor");
    expect(formatearNombre("jean-pierre")).toBe("Jean-Pierre");
  });

  it("aplica la regla Mc pero no Mac (apellidos hispanos)", () => {
    expect(formatearNombre("mcdonald")).toBe("McDonald");
    expect(formatearNombre("maciel")).toBe("Maciel");
    expect(formatearNombre("machado")).toBe("Machado");
  });

  it("preserva acentos y normaliza espacios", () => {
    expect(formatearNombre("josé MARTÍNEZ")).toBe("José Martínez");
    expect(formatearNombre("  ana   maría  ")).toBe("Ana María");
  });

  it("maneja entrada vacía", () => {
    expect(formatearNombre("")).toBe("");
    expect(formatearNombre("   ")).toBe("");
  });
});
