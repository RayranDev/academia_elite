import { describe, it, expect } from "vitest";
import { limiteMensajesPorHora } from "@/lib/limite-mensajes";

describe("limiteMensajesPorHora", () => {
  it("la familia tiene un tope bajo; el staff, uno que no estorba el uso diario", () => {
    expect(limiteMensajesPorHora("JUGADOR")).toBe(30);
    for (const rol of ["DT", "ESCUELA_ADMIN", "SUPER_ADMIN"] as const) {
      expect(limiteMensajesPorHora(rol)).toBeGreaterThan(30);
    }
  });
});
