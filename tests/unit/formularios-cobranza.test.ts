import { describe, it, expect } from "vitest";
import {
  arancelSchema,
  editarArancelSchema,
  arancelDesdeFormData,
  editarArancelDesdeFormData,
} from "@/lib/validators/arancel";
import {
  membresiaSchema,
  generarCuotasSchema,
  membresiaDesdeFormData,
  generarCuotasDesdeFormData,
} from "@/lib/validators/membresia";
import {
  crearConceptoCobroSchema,
  editarConceptoCobroSchema,
  crearConceptoDesdeFormData,
  editarConceptoDesdeFormData,
} from "@/lib/validators/concepto-cobro";

/**
 * Contrato formulario ↔ schema.
 *
 * Estos tests existen por un bug concreto: al migrar `concepto` (enum) a
 * `conceptoId` (FK al catálogo de la escuela) se renombró el schema y NO el
 * mapeo que leía el `FormData`. `safeParse` recibe `unknown`, así que la clave
 * vieja se descartó en silencio y la nueva llegó `undefined`: el alta de
 * precios y el alta de cuotas quedaron rotas, y typecheck, lint y los 384 tests
 * pasaron igual. No hay tipo que lo agarre — hace falta un test.
 *
 * Cada caso arma un `FormData` con los MISMOS `name=` que renderiza la UI. Si
 * alguien renombra un campo del schema sin tocar el mapeo, esto se pone rojo.
 */

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

describe("alta de precio — ArancelesPanel + ConceptoSelect", () => {
  it("el FormData del formulario pasa el schema", () => {
    const r = arancelSchema.safeParse(
      arancelDesdeFormData(
        fd({
          categoriaId: "cat_1",
          conceptoId: "cpt_mensualidad", // ConceptoSelect: name="conceptoId"
          monto: "45000",
          descripcion: "",
          vigenteDesde: "2026-08-01",
        }),
      ),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.conceptoId).toBe("cpt_mensualidad");
      expect(r.data.monto).toBe(45000);
      expect(r.data.categoriaId).toBe("cat_1");
    }
  });

  it("sin categoría el precio es el general de la escuela", () => {
    const r = arancelSchema.safeParse(
      arancelDesdeFormData(fd({ conceptoId: "cpt_mensualidad", monto: "45000" })),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.categoriaId).toBeNull();
  });

  // El caso exacto que se rompió: el mapeo manda la clave que el schema NO pide.
  it("falla con el mensaje del dominio si falta el concepto, no con uno de Zod crudo", () => {
    const r = arancelSchema.safeParse(
      arancelDesdeFormData(fd({ monto: "45000" })),
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Elige un concepto.");
    }
  });
});

describe("edición de precio — EditarArancelModal", () => {
  it("el FormData del modal pasa el schema", () => {
    const r = editarArancelSchema.safeParse(
      editarArancelDesdeFormData(
        fd({
          id: "arancel_1",
          categoriaId: "",
          conceptoId: "cpt_torneo",
          monto: "200000",
          descripcion: "Torneo Bogotá",
          vigenteDesde: "2026-09-01",
        }),
      ),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.id).toBe("arancel_1");
      expect(r.data.conceptoId).toBe("cpt_torneo");
    }
  });
});

describe("alta de cuota — MembresiasPanel + ConceptoSelect", () => {
  it("el FormData del formulario pasa el schema", () => {
    const r = membresiaSchema.safeParse(
      membresiaDesdeFormData(
        fd({
          jugadorId: "jug_1",
          periodo: "2026-08",
          conceptoId: "cpt_mensualidad",
          monto: "45000",
          descuento: "",
          estado: "PENDIENTE",
        }),
      ),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.conceptoId).toBe("cpt_mensualidad");
      expect(r.data.descuento).toBeNull();
    }
  });

  it("falla con el mensaje del dominio si falta el concepto", () => {
    const r = membresiaSchema.safeParse(
      membresiaDesdeFormData(
        fd({ jugadorId: "jug_1", periodo: "2026-08", estado: "PENDIENTE" }),
      ),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Elige un concepto.");
  });
});

describe("cobranza masiva — GenerarCuotasCard", () => {
  it("el FormData de la tarjeta pasa el schema", () => {
    const r = generarCuotasSchema.safeParse(
      generarCuotasDesdeFormData(fd({ periodo: "2026-08", conceptoId: "cpt_torneo" })),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.conceptoId).toBe("cpt_torneo");
  });

  // El concepto es opcional acá: sin él, el servicio emite la mensualidad.
  it("sin concepto queda en null y el servicio resuelve la mensualidad", () => {
    const r = generarCuotasSchema.safeParse(
      generarCuotasDesdeFormData(fd({ periodo: "2026-08" })),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.conceptoId).toBeNull();
  });

  it("rechaza un período mal formado", () => {
    const r = generarCuotasSchema.safeParse(
      generarCuotasDesdeFormData(fd({ periodo: "2026-13" })),
    );
    expect(r.success).toBe(false);
  });
});

describe("conceptos de cobro — ConceptosPanel", () => {
  it("el alta pasa el schema", () => {
    const r = crearConceptoCobroSchema.safeParse(
      crearConceptoDesdeFormData(fd({ nombre: "Torneo Bogotá 2026" })),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nombre).toBe("Torneo Bogotá 2026");
  });

  it("renombrar conservando activo lo deja activo", () => {
    const r = editarConceptoCobroSchema.safeParse(
      editarConceptoDesdeFormData(
        fd({ id: "cpt_1", nombre: "Pensión", activo: "true" }),
      ),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.activo).toBe(true);
  });

  // El caso que rompe con `z.coerce.boolean()`: el checkbox desmarcado NO viaja
  // en el FormData, y el panel se apoya en esa ausencia para archivar.
  it("archivar es la AUSENCIA del campo activo, no un 'false' de texto", () => {
    const r = editarConceptoCobroSchema.safeParse(
      editarConceptoDesdeFormData(fd({ id: "cpt_1", nombre: "Torneo viejo" })),
    );
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.activo).toBe(false);
  });

  it("exige el nombre con el mensaje del dominio", () => {
    const r = crearConceptoCobroSchema.safeParse(crearConceptoDesdeFormData(fd({})));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Escribe un nombre para el concepto.");
    }
  });
});
