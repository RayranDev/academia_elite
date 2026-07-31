import { describe, it, expect } from "vitest";
import {
  membresiaSchema,
  cambiarEstadoMembresiaSchema,
  CONCEPTOS_MEMBRESIA,
  MEDIOS_PAGO,
} from "@/lib/validators/membresia";

// Validadores de cobranza (Track A · A.0). El módulo de dinero es el que
// sostiene a la escuela: lo que entra por el borde tiene que estar acotado.

const base = {
  jugadorId: "jug_1",
  periodo: "2026-06",
  estado: "PENDIENTE" as const,
};

describe("membresiaSchema", () => {
  it("acepta un cobro mínimo y asume MENSUALIDAD", () => {
    const r = membresiaSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.concepto).toBe("MENSUALIDAD");
      expect(r.data.monto).toBeNull();
      expect(r.data.descuento).toBeNull();
    }
  });

  it("exige el período en formato AAAA-MM", () => {
    expect(membresiaSchema.safeParse({ ...base, periodo: "junio" }).success).toBe(false);
    expect(membresiaSchema.safeParse({ ...base, periodo: "2026-6" }).success).toBe(false);
    expect(membresiaSchema.safeParse({ ...base, periodo: "2026-06" }).success).toBe(true);
  });

  it("convierte el campo vacío del formulario en null, no en 0", () => {
    const r = membresiaSchema.safeParse({ ...base, monto: "", descuento: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.monto).toBeNull();
      expect(r.data.descuento).toBeNull();
    }
  });

  it("conserva un monto de 0 como 0 (una beca total es un cobro válido)", () => {
    const r = membresiaSchema.safeParse({ ...base, monto: "0" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.monto).toBe(0);
  });

  it("rechaza montos negativos", () => {
    expect(membresiaSchema.safeParse({ ...base, monto: "-1" }).success).toBe(false);
  });

  it("rechaza un concepto inventado", () => {
    expect(membresiaSchema.safeParse({ ...base, concepto: "ASADO" }).success).toBe(false);
    for (const c of CONCEPTOS_MEMBRESIA) {
      expect(membresiaSchema.safeParse({ ...base, concepto: c }).success).toBe(true);
    }
  });
});

describe("cambiarEstadoMembresiaSchema", () => {
  const cambio = { membresiaId: "mem_1", estado: "PAGADA" as const };

  it("acepta el cambio sin datos de pago (medio y referencia son opcionales)", () => {
    const r = cambiarEstadoMembresiaSchema.safeParse(cambio);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.medioPago).toBeNull();
      expect(r.data.referenciaPago).toBeNull();
    }
  });

  it("acepta cada medio de pago de la unión", () => {
    for (const m of MEDIOS_PAGO) {
      expect(cambiarEstadoMembresiaSchema.safeParse({ ...cambio, medioPago: m }).success).toBe(true);
    }
  });

  it("rechaza un medio de pago fuera de la unión", () => {
    expect(
      cambiarEstadoMembresiaSchema.safeParse({ ...cambio, medioPago: "CRIPTO" }).success,
    ).toBe(false);
  });

  it("sanitiza la referencia: es texto libre del usuario", () => {
    expect(
      cambiarEstadoMembresiaSchema.safeParse({
        ...cambio,
        referenciaPago: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);

    const ok = cambiarEstadoMembresiaSchema.safeParse({
      ...cambio,
      referenciaPago: "  TRF-99812  ",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.referenciaPago).toBe("TRF-99812");
  });

  it("rechaza una referencia más larga que el límite", () => {
    expect(
      cambiarEstadoMembresiaSchema.safeParse({
        ...cambio,
        referenciaPago: "x".repeat(61),
      }).success,
    ).toBe(false);
  });
});
