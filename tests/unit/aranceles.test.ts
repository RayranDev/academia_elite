import { describe, it, expect } from "vitest";
import {
  resolverArancel,
  referenciaDePrecio,
  type ArancelVigente,
} from "@/lib/aranceles";
import { arancelSchema, editarArancelSchema } from "@/lib/validators/arancel";

// Resolución de precios (Track A · A.1). Es la función que decide cuánto se le
// cobra a una familia: cada regla tiene su caso.

const HOY = new Date("2026-07-15T00:00:00Z");

function arancel(p: Partial<ArancelVigente> & { id: string }): ArancelVigente {
  return {
    categoriaId: null,
    concepto: "MENSUALIDAD",
    monto: 100,
    vigenteDesde: new Date("2026-01-01T00:00:00Z"),
    ...p,
  };
}

describe("resolverArancel", () => {
  it("devuelve null cuando no hay ningún precio", () => {
    expect(resolverArancel([], "cat_1", "MENSUALIDAD", HOY)).toBeNull();
  });

  it("usa el precio general cuando la categoría no tiene uno propio", () => {
    const r = resolverArancel([arancel({ id: "general", monto: 45000 })], "cat_1", "MENSUALIDAD", HOY);
    expect(r?.id).toBe("general");
    expect(r?.monto).toBe(45000);
  });

  it("el precio de la categoría gana sobre el general", () => {
    const r = resolverArancel(
      [
        arancel({ id: "general", monto: 45000 }),
        arancel({ id: "propio", categoriaId: "cat_1", monto: 60000 }),
      ],
      "cat_1",
      "MENSUALIDAD",
      HOY,
    );
    expect(r?.id).toBe("propio");
  });

  it("el precio de OTRA categoría no se filtra", () => {
    const r = resolverArancel(
      [
        arancel({ id: "general", monto: 45000 }),
        arancel({ id: "otra", categoriaId: "cat_2", monto: 99000 }),
      ],
      "cat_1",
      "MENSUALIDAD",
      HOY,
    );
    expect(r?.id).toBe("general");
  });

  it("dentro del mismo alcance gana el vigenteDesde más reciente", () => {
    const r = resolverArancel(
      [
        arancel({ id: "viejo", monto: 40000, vigenteDesde: new Date("2026-01-01T00:00:00Z") }),
        arancel({ id: "nuevo", monto: 50000, vigenteDesde: new Date("2026-06-01T00:00:00Z") }),
      ],
      "cat_1",
      "MENSUALIDAD",
      HOY,
    );
    expect(r?.id).toBe("nuevo");
  });

  it("ignora un aumento programado a futuro hasta que llega su fecha", () => {
    const lista = [
      arancel({ id: "actual", monto: 45000, vigenteDesde: new Date("2026-01-01T00:00:00Z") }),
      arancel({ id: "futuro", monto: 55000, vigenteDesde: new Date("2026-09-01T00:00:00Z") }),
    ];
    expect(resolverArancel(lista, "cat_1", "MENSUALIDAD", HOY)?.id).toBe("actual");
    // Ya en septiembre, el aumento entra solo.
    const septiembre = new Date("2026-09-02T00:00:00Z");
    expect(resolverArancel(lista, "cat_1", "MENSUALIDAD", septiembre)?.id).toBe("futuro");
  });

  it("un precio propio vigente gana aunque el general sea posterior", () => {
    // El alcance manda sobre la fecha: si la categoría tiene precio propio, no
    // se cae al general por más reciente que sea.
    const r = resolverArancel(
      [
        arancel({ id: "general-nuevo", monto: 45000, vigenteDesde: new Date("2026-07-01T00:00:00Z") }),
        arancel({ id: "propio-viejo", categoriaId: "cat_1", monto: 60000, vigenteDesde: new Date("2026-02-01T00:00:00Z") }),
      ],
      "cat_1",
      "MENSUALIDAD",
      HOY,
    );
    expect(r?.id).toBe("propio-viejo");
  });

  it("no mezcla conceptos", () => {
    const r = resolverArancel(
      [
        arancel({ id: "matricula", concepto: "MATRICULA", monto: 200000 }),
        arancel({ id: "mensual", concepto: "MENSUALIDAD", monto: 45000 }),
      ],
      "cat_1",
      "MATRICULA",
      HOY,
    );
    expect(r?.id).toBe("matricula");
  });

  it("un precio con vigenteDesde exactamente hoy ya aplica", () => {
    const r = resolverArancel(
      [arancel({ id: "hoy", vigenteDesde: HOY })],
      "cat_1",
      "MENSUALIDAD",
      HOY,
    );
    expect(r?.id).toBe("hoy");
  });
});

describe("referenciaDePrecio", () => {
  it("emitir un período futuro toma el inicio de ESE período, no hoy", () => {
    // Genero septiembre estando en julio: tiene que mirar el 1 de septiembre.
    expect(referenciaDePrecio("2026-09", HOY)).toEqual(new Date("2026-09-01T00:00:00Z"));
  });

  it("emitir el mes en curso usa hoy, no el 1° del mes", () => {
    // Si retrocediera al 1°, una escuela que carga su primer precio hoy y genera
    // el mes en curso se quedaría sin ningún precio vigente.
    expect(referenciaDePrecio("2026-07", HOY)).toEqual(HOY);
  });

  it("emitir un período pasado tampoco retrocede antes de hoy", () => {
    expect(referenciaDePrecio("2026-03", HOY)).toEqual(HOY);
  });

  it("un aumento fechado en agosto no afecta la cuota de julio emitida en julio", () => {
    const lista = [
      arancel({ id: "julio", monto: 45000, vigenteDesde: new Date("2026-01-01T00:00:00Z") }),
      arancel({ id: "agosto", monto: 55000, vigenteDesde: new Date("2026-08-01T00:00:00Z") }),
    ];
    const refJulio = referenciaDePrecio("2026-07", HOY);
    expect(resolverArancel(lista, "cat_1", "MENSUALIDAD", refJulio)?.id).toBe("julio");

    // Pero la cuota de agosto, generada el mismo día de julio, ya toma el nuevo.
    const refAgosto = referenciaDePrecio("2026-08", HOY);
    expect(resolverArancel(lista, "cat_1", "MENSUALIDAD", refAgosto)?.id).toBe("agosto");
  });

  it("un período mal formado cae a hoy en vez de romper", () => {
    expect(referenciaDePrecio("basura", HOY)).toEqual(HOY);
  });
});

describe("arancelSchema — el monto es obligatorio", () => {
  const base = { categoriaId: "", concepto: "MENSUALIDAD" as const, vigenteDesde: "" };

  // `z.coerce.number()` a secas convierte null y "" en 0 (Number(null) === 0).
  // Una Server Action es un endpoint HTTP: sin esta guarda, un POST sin el campo
  // crearía un precio de $0 y la escuela emitiría el mes entero en cero.
  it("rechaza el monto ausente en vez de convertirlo en 0", () => {
    expect(arancelSchema.safeParse({ ...base, monto: null }).success).toBe(false);
    expect(arancelSchema.safeParse({ ...base, monto: undefined }).success).toBe(false);
  });

  it("rechaza el monto vacío en vez de convertirlo en 0", () => {
    expect(arancelSchema.safeParse({ ...base, monto: "" }).success).toBe(false);
  });

  it("acepta un 0 explícito (una categoría gratuita es una decisión válida)", () => {
    const r = arancelSchema.safeParse({ ...base, monto: "0" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.monto).toBe(0);
  });

  it("acepta un monto normal y rechaza negativos y basura", () => {
    const r = arancelSchema.safeParse({ ...base, monto: "45000" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.monto).toBe(45000);
    expect(arancelSchema.safeParse({ ...base, monto: "-1" }).success).toBe(false);
    expect(arancelSchema.safeParse({ ...base, monto: "abc" }).success).toBe(false);
  });

  it("categoriaId vacío significa 'todas las categorías'", () => {
    const r = arancelSchema.safeParse({ ...base, monto: "45000" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.categoriaId).toBeNull();
  });

  it("descripcion es opcional: vacía o ausente se guarda como null", () => {
    const r1 = arancelSchema.safeParse({ ...base, monto: "45000", descripcion: "" });
    expect(r1.success).toBe(true);
    if (r1.success) expect(r1.data.descripcion).toBeNull();

    const r2 = arancelSchema.safeParse({ ...base, monto: "45000" });
    expect(r2.success).toBe(true);
    if (r2.success) expect(r2.data.descripcion).toBeNull();
  });

  it("descripcion es texto libre del usuario: pasa por textoSeguro", () => {
    expect(
      arancelSchema.safeParse({
        ...base,
        monto: "45000",
        descripcion: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);

    const ok = arancelSchema.safeParse({
      ...base,
      monto: "45000",
      descripcion: "  Cobro por torneo interno  ",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.descripcion).toBe("Cobro por torneo interno");
  });
});

describe("editarArancelSchema — mismas reglas de arancelSchema + id", () => {
  const base = {
    categoriaId: "",
    concepto: "MENSUALIDAD" as const,
    monto: "45000",
    vigenteDesde: "",
  };

  it("rechaza sin id", () => {
    expect(editarArancelSchema.safeParse(base).success).toBe(false);
    expect(editarArancelSchema.safeParse({ ...base, id: "" }).success).toBe(false);
  });

  it("acepta con id y mantiene las reglas de monto obligatorio", () => {
    const r = editarArancelSchema.safeParse({ ...base, id: "arancel_1" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.id).toBe("arancel_1");
      expect(r.data.monto).toBe(45000);
    }
    expect(
      editarArancelSchema.safeParse({ ...base, id: "arancel_1", monto: "" }).success,
    ).toBe(false);
  });
});
