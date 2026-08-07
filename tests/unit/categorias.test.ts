import { describe, it, expect } from "vitest";
import { categoriaSchema } from "@/lib/validators/escuela";

// Selector de años acotado + categorías "sin edad" (Fase A). El motor de
// evaluación nunca lee anioDesde/anioHasta: dejarlos en null es seguro para
// ligas libres, equipos mixtos o de adultos que no clasifican por año.

describe("categoriaSchema", () => {
  const base = { nombre: "Sub-14" };

  it("acepta años válidos sin sinEdad", () => {
    const r = categoriaSchema.safeParse({
      ...base,
      sinEdad: false,
      anioDesde: "2010",
      anioHasta: "2011",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.anioDesde).toBe(2010);
      expect(r.data.anioHasta).toBe(2011);
    }
  });

  it("con sinEdad true y sin años, guarda null/null", () => {
    const r = categoriaSchema.safeParse({
      ...base,
      sinEdad: true,
      anioDesde: undefined,
      anioHasta: undefined,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.anioDesde).toBeNull();
      expect(r.data.anioHasta).toBeNull();
    }
  });

  it("sin sinEdad y sin años, falla con error en anioDesde", () => {
    const r = categoriaSchema.safeParse({
      ...base,
      sinEdad: false,
      anioDesde: undefined,
      anioHasta: undefined,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("anioDesde"))).toBe(true);
    }
  });

  it("anioHasta menor a anioDesde (sin sinEdad) falla con error en anioHasta", () => {
    const r = categoriaSchema.safeParse({
      ...base,
      sinEdad: false,
      anioDesde: "2015",
      anioHasta: "2010",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("anioHasta"))).toBe(true);
    }
  });
});
