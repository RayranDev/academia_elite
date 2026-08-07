import { describe, it, expect } from "vitest";
import { editarRangosCategoriaSchema } from "@/lib/validators/categoria-rango";

// Calibración física por categoría (Fase B): 8 campos min/max. Sprint y
// agilidad son segundos (0 no es una marca físicamente posible → positive());
// salto y Yo-Yo admiten 0 como peor marca teórica → nonnegative(). La
// coherencia min < max NO se valida acá (Zod solo valida forma/rango de cada
// campo) — vive en `validarRangosCoherentes` del servicio.

describe("editarRangosCategoriaSchema", () => {
  const base = {
    categoriaId: "cat-1",
    sprintMin: 4.5,
    sprintMax: 6.5,
    saltoMin: 15,
    saltoMax: 42,
    agilidadMin: 16,
    agilidadMax: 21,
    yoyoMin: 4,
    yoyoMax: 15,
  };

  it("acepta un set de valores válido", () => {
    const r = editarRangosCategoriaSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sprintMin).toBe(4.5);
      expect(r.data.yoyoMax).toBe(15);
    }
  });

  it("coacciona strings numéricos (valores de FormData)", () => {
    const r = editarRangosCategoriaSchema.safeParse({
      ...base,
      sprintMin: "4.5",
      saltoMax: "42",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sprintMin).toBe(4.5);
      expect(r.data.saltoMax).toBe(42);
    }
  });

  it("rechaza falta de categoriaId", () => {
    const r = editarRangosCategoriaSchema.safeParse({ ...base, categoriaId: "" });
    expect(r.success).toBe(false);
  });

  it("rechaza sprintMin = 0 (no puede ser 0 en la práctica)", () => {
    const r = editarRangosCategoriaSchema.safeParse({ ...base, sprintMin: 0 });
    expect(r.success).toBe(false);
  });

  it("rechaza agilidadMax negativo", () => {
    const r = editarRangosCategoriaSchema.safeParse({ ...base, agilidadMax: -1 });
    expect(r.success).toBe(false);
  });

  it("acepta saltoMin = 0 (peor marca teórica válida)", () => {
    const r = editarRangosCategoriaSchema.safeParse({ ...base, saltoMin: 0 });
    expect(r.success).toBe(true);
  });

  it("acepta yoyoMin = 0 (peor marca teórica válida)", () => {
    const r = editarRangosCategoriaSchema.safeParse({ ...base, yoyoMin: 0 });
    expect(r.success).toBe(true);
  });

  it("rechaza saltoMax negativo", () => {
    const r = editarRangosCategoriaSchema.safeParse({ ...base, saltoMax: -5 });
    expect(r.success).toBe(false);
  });

  it("rechaza valores no numéricos", () => {
    const r = editarRangosCategoriaSchema.safeParse({ ...base, sprintMin: "no-es-numero" });
    expect(r.success).toBe(false);
  });
});
