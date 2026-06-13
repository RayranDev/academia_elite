import { describe, it, expect } from "vitest";
import { tieneContenidoPeligroso, textoSeguro } from "@/lib/validators/sanitizar";
import { protegerCelda } from "@/lib/xlsx";

describe("tieneContenidoPeligroso", () => {
  it("detecta etiquetas HTML y handlers", () => {
    expect(tieneContenidoPeligroso("<script>alert(1)</script>")).toBe(true);
    expect(tieneContenidoPeligroso("<img src=x onerror=alert(1)>")).toBe(true);
    expect(tieneContenidoPeligroso("javascript:alert(1)")).toBe(true);
    expect(tieneContenidoPeligroso("<b>hola</b>")).toBe(true);
  });
  it("permite texto normal", () => {
    expect(tieneContenidoPeligroso("Lucas García")).toBe(false);
    expect(tieneContenidoPeligroso("Escuela #1 - Bogotá")).toBe(false);
    expect(tieneContenidoPeligroso("3 < 5 y 5 > 3")).toBe(false); // sin etiqueta real
  });
});

describe("textoSeguro", () => {
  const s = textoSeguro({ min: 2, max: 20 });
  it("rechaza HTML/script", () => {
    expect(s.safeParse("<script>x</script>").success).toBe(false);
  });
  it("acepta texto válido y recorta", () => {
    const r = s.safeParse("  Ana  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("Ana");
  });
});

describe("protegerCelda (anti CSV injection)", () => {
  it("antepone apóstrofo a celdas con fórmula", () => {
    expect(protegerCelda("=1+1")).toBe("'=1+1");
    expect(protegerCelda("+57")).toBe("'+57");
    expect(protegerCelda("@cmd")).toBe("'@cmd");
    expect(protegerCelda("-5")).toBe("'-5");
  });
  it("deja intacto el texto normal", () => {
    expect(protegerCelda("García")).toBe("García");
    expect(protegerCelda("ABC123")).toBe("ABC123");
  });
});
