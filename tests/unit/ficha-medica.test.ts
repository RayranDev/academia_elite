import { describe, it, expect } from "vitest";
import { fichaMedicaSchema, TIPOS_DOCUMENTO, TIPOS_RH } from "@/lib/validators/gestion";

// Validador de la ficha administrativa/médica (datos sensibles de salud,
// HABEAS-DATA.md). El consentimiento (`autorizaDatosSalud`) es una regla de
// NEGOCIO que aplica el servicio, no el validador — acá solo se prueba forma.

const base = {
  jugadorId: "jug_1",
  autorizaTraslado: false,
  autorizaDatosSalud: false,
};

describe("fichaMedicaSchema", () => {
  it("acepta el mínimo: solo jugadorId y los dos booleanos", () => {
    const r = fichaMedicaSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tipoDocumento).toBeNull();
      expect(r.data.eps).toBeNull();
      expect(r.data.aptoMedicoVence).toBeNull();
    }
  });

  it("convierte cadenas vacías del formulario en null, no en \"\"", () => {
    const r = fichaMedicaSchema.safeParse({
      ...base,
      numeroDocumento: "",
      alergias: "",
      contactoEmergenciaTelefono: "",
      aptoMedicoVence: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.numeroDocumento).toBeNull();
      expect(r.data.alergias).toBeNull();
      expect(r.data.contactoEmergenciaTelefono).toBeNull();
      expect(r.data.aptoMedicoVence).toBeNull();
    }
  });

  it("acepta cada tipo de documento y de RH de la unión", () => {
    for (const t of TIPOS_DOCUMENTO) {
      expect(fichaMedicaSchema.safeParse({ ...base, tipoDocumento: t }).success).toBe(true);
    }
    for (const rh of TIPOS_RH) {
      expect(fichaMedicaSchema.safeParse({ ...base, rh }).success).toBe(true);
    }
  });

  it("rechaza un tipo de documento o RH fuera de la unión", () => {
    expect(fichaMedicaSchema.safeParse({ ...base, tipoDocumento: "PASAPORTE" }).success).toBe(false);
    expect(fichaMedicaSchema.safeParse({ ...base, rh: "Z+" }).success).toBe(false);
  });

  it("sanitiza los campos de texto libre (alergias, condiciones, EPS)", () => {
    expect(
      fichaMedicaSchema.safeParse({ ...base, alergias: "<script>alert(1)</script>" }).success,
    ).toBe(false);
    expect(
      fichaMedicaSchema.safeParse({ ...base, condicionesMedicas: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(fichaMedicaSchema.safeParse({ ...base, eps: "<img onerror=x>" }).success).toBe(false);
  });

  it("formatea el nombre del contacto de emergencia igual que nombre/apellido", () => {
    const r = fichaMedicaSchema.safeParse({
      ...base,
      contactoEmergenciaNombre: "  maría josé  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contactoEmergenciaNombre).toBe("María José");
  });

  it("solo acepta un parentesco del catálogo cerrado", () => {
    expect(
      fichaMedicaSchema.safeParse({ ...base, contactoEmergenciaParentesco: "Vecino" }).success,
    ).toBe(false);
    expect(
      fichaMedicaSchema.safeParse({ ...base, contactoEmergenciaParentesco: "Tío/a" }).success,
    ).toBe(true);
  });

  it("rechaza un teléfono con letras", () => {
    expect(
      fichaMedicaSchema.safeParse({ ...base, contactoEmergenciaTelefono: "abc123" }).success,
    ).toBe(false);
  });

  it("exige los dos booleanos de autorización", () => {
    const sinTraslado: Record<string, unknown> = { ...base };
    delete sinTraslado.autorizaTraslado;
    expect(fichaMedicaSchema.safeParse(sinTraslado).success).toBe(false);
  });
});
