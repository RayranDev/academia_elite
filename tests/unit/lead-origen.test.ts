import { describe, it, expect } from "vitest";
import { leadSchema, leadFormSchema, ORIGENES_LEAD } from "@/lib/validators/lead";

// Atribución de leads (Instagram → landing → lead). El campo `origen` acota a
// propósito el texto libre: alimenta reportes y filtros del panel admin.

const baseForm = {
  nombreEscuela: "Escuela Test",
  contactoNombre: "Ivan Rairan",
  contactoEmail: "ivan@example.com",
  codigoPais: "+57",
  numeroTelefono: "3001234567",
};

const base = {
  nombreEscuela: "Escuela Test",
  contactoNombre: "Ivan Rairan",
  contactoEmail: "ivan@example.com",
  telefono: "+57 3001234567",
};

describe("leadFormSchema — origen", () => {
  it("acepta el envío sin origen (deja que el repositorio asuma LANDING)", () => {
    const r = leadFormSchema.safeParse(baseForm);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.origen).toBeUndefined();
  });

  it("acepta cada valor de la unión de orígenes", () => {
    for (const origen of ORIGENES_LEAD) {
      const r = leadFormSchema.safeParse({ ...baseForm, origen });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.origen).toBe(origen);
    }
  });

  it("rechaza un origen fuera de la unión (no es texto libre)", () => {
    expect(
      leadFormSchema.safeParse({ ...baseForm, origen: "REFERIDO_INVENTADO" }).success,
    ).toBe(false);
  });
});

describe("leadSchema — origen", () => {
  it("acepta el dato sin origen y con INSTAGRAM", () => {
    expect(leadSchema.safeParse(base).success).toBe(true);
    expect(leadSchema.safeParse({ ...base, origen: "INSTAGRAM" }).success).toBe(true);
  });

  it("rechaza un origen que no está en la unión", () => {
    expect(leadSchema.safeParse({ ...base, origen: "TIKTOK" }).success).toBe(false);
  });
});
