import { describe, it, expect } from "vitest";
import {
  codigoDesdeNombre,
  codigoDisponible,
  crearConceptoCobroSchema,
  editarConceptoCobroSchema,
  CONCEPTOS_SISTEMA,
} from "@/lib/validators/concepto-cobro";

// Catálogo de conceptos por escuela. El `codigo` es la clave estable del
// concepto: si se genera mal o colisiona, dos cobros distintos terminan siendo
// el mismo y el unique de Membresia rechaza el segundo.

describe("codigoDesdeNombre", () => {
  it("normaliza a mayúsculas sin tildes y con guiones bajos", () => {
    expect(codigoDesdeNombre("Torneo Bogotá 2026")).toBe("TORNEO_BOGOTA_2026");
    expect(codigoDesdeNombre("Matrícula")).toBe("MATRICULA");
    expect(codigoDesdeNombre("Uniforme de salida")).toBe("UNIFORME_DE_SALIDA");
  });

  it("no deja guiones bajos colgando en los extremos", () => {
    expect(codigoDesdeNombre("  ¡Torneo!  ")).toBe("TORNEO");
    expect(codigoDesdeNombre("--Copa--")).toBe("COPA");
  });

  it("un nombre solo de símbolos da vacío (lo resuelve codigoDisponible)", () => {
    expect(codigoDesdeNombre("¿¡...!?")).toBe("");
  });

  it("acota el largo para no chocar contra el tope de la columna", () => {
    expect(codigoDesdeNombre("a".repeat(80))).toHaveLength(40);
  });
});

describe("codigoDisponible", () => {
  it("devuelve el código base cuando está libre", () => {
    expect(codigoDisponible("Torneo Bogotá", new Set())).toBe("TORNEO_BOGOTA");
  });

  // Dos nombres distintos pueden colapsar al mismo código. Rechazar el alta
  // sería castigar a la escuela por un detalle interno nuestro.
  it("desempata con sufijo numérico en vez de rechazar el alta", () => {
    const ocupados = new Set(["TORNEO"]);
    expect(codigoDisponible("Torneo", ocupados)).toBe("TORNEO_2");
    ocupados.add("TORNEO_2");
    expect(codigoDisponible("Torneo #1", ocupados)).toBe("TORNEO_1");
    expect(codigoDisponible("Torneo", ocupados)).toBe("TORNEO_3");
  });

  it("un nombre sin caracteres útiles cae a un código genérico", () => {
    expect(codigoDisponible("¿¡...!?", new Set())).toBe("CONCEPTO");
    expect(codigoDisponible("***", new Set(["CONCEPTO"]))).toBe("CONCEPTO_2");
  });

  it("el sufijo no empuja el código más allá del tope de largo", () => {
    const base = codigoDesdeNombre("b".repeat(60));
    expect(codigoDisponible("b".repeat(60), new Set([base])).length).toBeLessThanOrEqual(40);
  });
});

describe("CONCEPTOS_SISTEMA", () => {
  it("no tiene códigos repetidos (el unique por escuela los rechazaría)", () => {
    const codigos = CONCEPTOS_SISTEMA.map((c) => c.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  // La cobranza masiva sin concepto explícito emite MENSUALIDAD: si el catálogo
  // dejara de traerla, `conceptoMensualidad` no tendría a qué caer.
  it("incluye MENSUALIDAD, que es el default de la cobranza masiva", () => {
    expect(CONCEPTOS_SISTEMA.some((c) => c.codigo === "MENSUALIDAD")).toBe(true);
  });
});

describe("esquemas de concepto", () => {
  it("exige un nombre no vacío", () => {
    expect(crearConceptoCobroSchema.safeParse({ nombre: "" }).success).toBe(false);
    expect(crearConceptoCobroSchema.safeParse({ nombre: "   " }).success).toBe(false);
    expect(crearConceptoCobroSchema.safeParse({ nombre: "Torneo" }).success).toBe(true);
  });

  // AGENTS.md §5: todo texto libre pasa por textoSeguro.
  it("rechaza HTML en el nombre", () => {
    expect(
      crearConceptoCobroSchema.safeParse({ nombre: "<script>alert(1)</script>" }).success,
    ).toBe(false);
    expect(
      crearConceptoCobroSchema.safeParse({ nombre: "Torneo <b>2026</b>" }).success,
    ).toBe(false);
  });

  it("la edición exige id y no acepta cambiar el código", () => {
    const ok = editarConceptoCobroSchema.safeParse({
      id: "cpt_1",
      nombre: "Pensión",
      activo: "true",
      codigo: "OTRO_CODIGO",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data).not.toHaveProperty("codigo");
      expect(ok.data.activo).toBe(true);
    }
    expect(
      editarConceptoCobroSchema.safeParse({ id: "", nombre: "Pensión", activo: "true" })
        .success,
    ).toBe(false);
  });

  // `z.coerce.boolean()` daría `true` para el string "false" (los valores de un
  // FormData son siempre strings): archivar reportaría éxito sin archivar nada.
  it("archiva de verdad cuando activo llega como 'false'", () => {
    const casos: [unknown, boolean][] = [
      ["true", true],
      ["on", true], // checkbox marcado
      ["false", false],
      [undefined, false], // checkbox desmarcado: no viaja en el FormData
    ];
    for (const [entrada, esperado] of casos) {
      const r = editarConceptoCobroSchema.safeParse({
        id: "cpt_1",
        nombre: "Torneo",
        activo: entrada,
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.activo).toBe(esperado);
    }
  });
});
