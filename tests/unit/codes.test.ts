import { describe, it, expect } from "vitest";
import { generarCodigoInvitacion } from "@/lib/codes";

describe("generarCodigoInvitacion", () => {
  it("respeta la longitud pedida", () => {
    expect(generarCodigoInvitacion()).toHaveLength(8);
    expect(generarCodigoInvitacion(10)).toHaveLength(10);
  });

  it("usa solo el alfabeto sin caracteres ambiguos (sin 0,O,1,I,L)", () => {
    const muestra = Array.from({ length: 200 }, () => generarCodigoInvitacion()).join("");
    expect(muestra).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
  });

  it("es razonablemente único (sin colisiones en una muestra)", () => {
    const set = new Set(Array.from({ length: 500 }, () => generarCodigoInvitacion()));
    expect(set.size).toBe(500);
  });
});
