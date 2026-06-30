import { describe, it, expect } from "vitest";
import { capasDeEfecto, suprimeNivel, EFECTOS } from "@/lib/cartas/efectos";
import { fondoCrearSchema } from "@/lib/validators/fondo";

// Atajo: opacidad de una capa por su key.
function opacidadDe(capas: ReturnType<typeof capasDeEfecto>, key: string): number {
  return capas.find((c) => c.key === key)?.opacity ?? -1;
}

describe("capasDeEfecto", () => {
  it("NINGUNO no produce capas (garantiza no-regresión del foil genérico)", () => {
    expect(capasDeEfecto("NINGUNO", null, { animar: false })).toEqual([]);
    expect(capasDeEfecto("NINGUNO", null, { animar: true })).toEqual([]);
    expect(capasDeEfecto(null, null, { animar: true })).toEqual([]);
  });

  it("las capas base son export-safe: ninguna lleva animación", () => {
    for (const efecto of ["METALICO", "HIELO", "TRAMA", "HOLOGRAFICO"] as const) {
      const base = capasDeEfecto(efecto, {}, { animar: false });
      expect(base.length).toBeGreaterThan(0);
      expect(base.every((c) => !c.animacion)).toBe(true);
    }
  });

  it("animar:true agrega las capas animadas con su clase CSS", () => {
    const metal = capasDeEfecto("METALICO", {}, { animar: true });
    expect(metal.some((c) => c.animacion === "carta-sheen")).toBe(true);

    const hielo = capasDeEfecto("HIELO", {}, { animar: true });
    expect(hielo.some((c) => c.animacion === "carta-hielo")).toBe(true);

    const holo = capasDeEfecto("HOLOGRAFICO", {}, { animar: true });
    expect(holo.some((c) => c.animacion === "carta-holo")).toBe(true);
  });

  it("el tinte metálico cambia el sesgo de color", () => {
    const oro = capasDeEfecto("METALICO", { tinte: "oro" }, { animar: false });
    const acero = capasDeEfecto("METALICO", { tinte: "acero" }, { animar: false });
    const bgOro = oro.find((c) => c.key === "metal-tinte")?.background;
    const bgAcero = acero.find((c) => c.key === "metal-tinte")?.background;
    expect(bgOro).toBeTruthy();
    expect(bgOro).not.toEqual(bgAcero);
  });

  it("la intensidad modula la opacidad de forma monótona", () => {
    const baja = capasDeEfecto("METALICO", { intensidad: 0 }, { animar: false });
    const media = capasDeEfecto("METALICO", { intensidad: 0.5 }, { animar: false });
    const alta = capasDeEfecto("METALICO", { intensidad: 1 }, { animar: false });
    const oBaja = opacidadDe(baja, "metal-grano");
    const oMedia = opacidadDe(media, "metal-grano");
    const oAlta = opacidadDe(alta, "metal-grano");
    expect(oBaja).toBeLessThan(oMedia);
    expect(oMedia).toBeLessThan(oAlta);
  });

  it("TRAMA usa el patrón elegido y cae a 'carbono' por defecto", () => {
    const carbono = capasDeEfecto("TRAMA", { tramaPatron: "carbono" }, { animar: false });
    const hex = capasDeEfecto("TRAMA", { tramaPatron: "hexagonos" }, { animar: false });
    expect(carbono[0]?.background).not.toEqual(hex[0]?.background);

    const sinPatron = capasDeEfecto("TRAMA", {}, { animar: false });
    expect(sinPatron).toHaveLength(1);
    expect(sinPatron[0]?.background).toEqual(carbono[0]?.background); // default carbono
  });

  it("determinismo: misma entrada → misma salida", () => {
    const a = capasDeEfecto("HOLOGRAFICO", { intensidad: 0.7 }, { animar: true });
    const b = capasDeEfecto("HOLOGRAFICO", { intensidad: 0.7 }, { animar: true });
    expect(a).toEqual(b);
  });
});

describe("suprimeNivel", () => {
  it("los packs con textura propia reemplazan el foil/sheen del nivel", () => {
    expect(suprimeNivel("NINGUNO")).toBe(false);
    expect(suprimeNivel("METALICO")).toBe(true);
    expect(suprimeNivel("HIELO")).toBe(true);
    expect(suprimeNivel("TRAMA")).toBe(true);
    expect(suprimeNivel("HOLOGRAFICO")).toBe(true);
  });

  it("el registro cubre todos los efectos", () => {
    expect(Object.keys(EFECTOS).sort()).toEqual(
      ["HIELO", "HOLOGRAFICO", "METALICO", "NINGUNO", "TRAMA"],
    );
  });
});

describe("validador de fondo · efecto", () => {
  const base = {
    codigo: "TEST_FONDO",
    nombre: "Test",
    descripcion: "Descripción de prueba.",
    estilo: "linear-gradient(160deg,#000,#111)",
    colorTexto: "",
    requisitoTipo: "SIEMPRE",
    requisitoValor: "",
    orden: "",
  };

  it("TRAMA exige un patrón", () => {
    const sinPatron = fondoCrearSchema.safeParse({
      ...base,
      efecto: "TRAMA",
      efectoParams: JSON.stringify({ intensidad: 0.5 }),
    });
    expect(sinPatron.success).toBe(false);

    const conPatron = fondoCrearSchema.safeParse({
      ...base,
      efecto: "TRAMA",
      efectoParams: JSON.stringify({ tramaPatron: "carbono", intensidad: 0.5 }),
    });
    expect(conPatron.success).toBe(true);
  });

  it("rechaza tinte e intensidad inválidos", () => {
    const tinteMalo = fondoCrearSchema.safeParse({
      ...base,
      efecto: "METALICO",
      efectoParams: JSON.stringify({ tinte: "plastico" }),
    });
    expect(tinteMalo.success).toBe(false);

    const intensidadMala = fondoCrearSchema.safeParse({
      ...base,
      efecto: "METALICO",
      efectoParams: JSON.stringify({ intensidad: 5 }),
    });
    expect(intensidadMala.success).toBe(false);
  });

  it("NINGUNO con params vacíos persiste null", () => {
    const r = fondoCrearSchema.safeParse({ ...base, efecto: "NINGUNO", efectoParams: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.efectoParams).toBeNull();
  });
});
