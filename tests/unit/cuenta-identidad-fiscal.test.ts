import { describe, it, expect } from "vitest";
import {
  actualizarDatosSchema,
  actualizarDatosDesdeFormData,
} from "@/lib/validators/cuenta";

/**
 * Identificación fiscal del acudiente en "Mi cuenta" (`DatosCuentaForm`):
 * tipo/número de documento y dirección del ADQUIRIENTE, opcionales, para no
 * cerrarle la puerta a la escuela que se formalice ante la DIAN. Estos tests
 * cubren el contrato FormData -> schema con el mismo criterio que
 * `formularios-cobranza.test.ts` (arancelDesdeFormData): el mapeo vive al
 * lado del schema justamente para que un rename rompa acá, no solo en
 * producción.
 */

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

describe("actualizarDatosSchema — identificación fiscal", () => {
  it("acepta dejar todo vacío: los tres campos fiscales quedan null", () => {
    const r = actualizarDatosSchema.safeParse({
      nombre: "Camila Ríos",
      telefono: "",
      tipoDocumento: "",
      numeroDocumento: "",
      direccion: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tipoDocumento).toBeNull();
      expect(r.data.numeroDocumento).toBeNull();
      expect(r.data.direccion).toBeNull();
    }
  });

  it("acepta un tipo de documento válido del adquiriente (CC/CE/NIT/PAS)", () => {
    const r = actualizarDatosSchema.safeParse({
      nombre: "Camila Ríos",
      telefono: "",
      tipoDocumento: "NIT",
      numeroDocumento: "900123456-7",
      direccion: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tipoDocumento).toBe("NIT");
      expect(r.data.numeroDocumento).toBe("900123456-7");
    }
  });

  // RC/TI son del MENOR (Jugador.tipoDocumento), no del acudiente que paga.
  // Si esto pasara, un adulto podría quedar identificado como "Registro Civil".
  it("rechaza RC y TI: son del menor, no del adquiriente", () => {
    const rc = actualizarDatosSchema.safeParse({
      nombre: "Camila Ríos",
      telefono: "",
      tipoDocumento: "RC",
      numeroDocumento: "",
      direccion: "",
    });
    expect(rc.success).toBe(false);

    const ti = actualizarDatosSchema.safeParse({
      nombre: "Camila Ríos",
      telefono: "",
      tipoDocumento: "TI",
      numeroDocumento: "",
      direccion: "",
    });
    expect(ti.success).toBe(false);
  });

  it("rechaza un número de documento con letras u otros caracteres", () => {
    const r = actualizarDatosSchema.safeParse({
      nombre: "Camila Ríos",
      telefono: "",
      tipoDocumento: "CC",
      numeroDocumento: "abc123",
      direccion: "",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza HTML/scripts en la dirección (textoSeguro)", () => {
    const r = actualizarDatosSchema.safeParse({
      nombre: "Camila Ríos",
      telefono: "",
      tipoDocumento: "",
      numeroDocumento: "",
      direccion: "<script>alert(1)</script>",
    });
    expect(r.success).toBe(false);
  });
});

describe("actualizarDatosDesdeFormData — DatosCuentaForm", () => {
  it("el FormData del formulario (mismos name= que el componente) pasa el schema", () => {
    const r = actualizarDatosSchema.safeParse(
      actualizarDatosDesdeFormData(
        fd({
          nombre: "Camila Ríos",
          telefono: "+57 300 000 0000",
          tipoDocumento: "CC",
          numeroDocumento: "123456789",
          direccion: "Calle 10 # 20-30, Bogotá",
        }),
      ),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tipoDocumento).toBe("CC");
      expect(r.data.numeroDocumento).toBe("123456789");
      expect(r.data.direccion).toBe("Calle 10 # 20-30, Bogotá");
    }
  });

  it("sin los campos fiscales en el FormData, el mapeo los deja en null (no undefined)", () => {
    const r = actualizarDatosSchema.safeParse(
      actualizarDatosDesdeFormData(fd({ nombre: "Camila Ríos" })),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tipoDocumento).toBeNull();
      expect(r.data.numeroDocumento).toBeNull();
      expect(r.data.direccion).toBeNull();
    }
  });
});
