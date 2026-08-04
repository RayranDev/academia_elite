import { describe, it, expect } from "vitest";
import {
  egresoSchema,
  CONCEPTOS_EGRESO,
} from "@/lib/validators/egreso";
import { MEDIOS_PAGO } from "@/lib/validators/membresia";

// Validadores de egresos/caja. El monto acá es siempre obligatorio (a diferencia
// de Membresia, donde una cuota puede crearse sin precio resuelto).

const base = {
  concepto: "CANCHA" as const,
  monto: "150000",
  fecha: "2026-06-15",
};

describe("egresoSchema", () => {
  it("acepta un egreso mínimo válido", () => {
    const r = egresoSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.monto).toBe(150000);
      expect(r.data.descripcion).toBeNull();
      expect(r.data.medioPago).toBeNull();
      expect(r.data.referenciaPago).toBeNull();
    }
  });

  it("rechaza monto vacío o faltante (acá el monto es obligatorio)", () => {
    expect(egresoSchema.safeParse({ ...base, monto: "" }).success).toBe(false);
    expect(
      egresoSchema.safeParse({ concepto: base.concepto, fecha: base.fecha }).success,
    ).toBe(false);
  });

  it("rechaza monto negativo o cero", () => {
    expect(egresoSchema.safeParse({ ...base, monto: "-1" }).success).toBe(false);
    expect(egresoSchema.safeParse({ ...base, monto: "0" }).success).toBe(false);
  });

  it("acepta cada concepto de CONCEPTOS_EGRESO", () => {
    for (const c of CONCEPTOS_EGRESO) {
      expect(egresoSchema.safeParse({ ...base, concepto: c }).success).toBe(true);
    }
  });

  it("rechaza un concepto inventado", () => {
    expect(egresoSchema.safeParse({ ...base, concepto: "ASADO" }).success).toBe(false);
  });

  it("sanitiza la descripción: es texto libre del usuario", () => {
    expect(
      egresoSchema.safeParse({
        ...base,
        descripcion: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);

    const ok = egresoSchema.safeParse({ ...base, descripcion: "  Alquiler cancha  " });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.descripcion).toBe("Alquiler cancha");
  });

  it("acepta cada medio de pago de la unión", () => {
    for (const m of MEDIOS_PAGO) {
      expect(egresoSchema.safeParse({ ...base, medioPago: m }).success).toBe(true);
    }
  });

  it("rechaza un medio de pago fuera de la unión", () => {
    expect(egresoSchema.safeParse({ ...base, medioPago: "CRIPTO" }).success).toBe(false);
  });

  it("acepta una fecha válida y rechaza una inválida o vacía", () => {
    expect(egresoSchema.safeParse({ ...base, fecha: "2026-06-15" }).success).toBe(true);
    expect(egresoSchema.safeParse({ ...base, fecha: "" }).success).toBe(false);
    expect(egresoSchema.safeParse({ ...base, fecha: "no-es-fecha" }).success).toBe(false);
  });
});
