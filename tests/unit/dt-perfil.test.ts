import { describe, it, expect } from "vitest";
import { inicioDeMes } from "@/lib/dt-perfil";

// Perfil del DT: `inicioDeMes` acota el período "Este mes" en la hora de la
// ESCUELA (Colombia, UTC-5), no la del proceso — mismo motivo que `periodoDe`
// en cobranza.ts. Los casos usan ISO con "Z" explícito y comparan contra un
// ISO esperado (nunca getters locales: el test no puede depender de en qué
// zona horaria corra la máquina que lo ejecuta, ver tests/unit/cobranza.test.ts).

describe("inicioDeMes", () => {
  it("devuelve el 1° del mes a medianoche en Colombia (05:00 UTC)", () => {
    const resultado = inicioDeMes(new Date("2026-08-15T18:30:00Z"));
    expect(resultado.toISOString()).toBe("2026-08-01T05:00:00.000Z");
  });

  it("no se ve afectado por el día/hora de entrada dentro del mismo mes en Colombia", () => {
    const inicioMes = inicioDeMes(new Date("2026-01-01T05:00:00Z")); // 1° de enero, 00:00 Colombia
    const finMes = inicioDeMes(new Date("2026-01-31T23:00:00Z")); // 31 de enero, 18:00 Colombia
    expect(inicioMes.getTime()).toBe(finMes.getTime());
  });

  it("respeta el cambio de año en diciembre", () => {
    const resultado = inicioDeMes(new Date("2025-12-25T12:00:00Z"));
    expect(resultado.toISOString()).toBe("2025-12-01T05:00:00.000Z");
  });

  it("el borde de medianoche en Colombia (05:00 UTC) cae del lado correcto del mes", () => {
    // 04:59 UTC del 1° de febrero todavía es 31 de enero a las 23:59 en Colombia.
    expect(inicioDeMes(new Date("2026-02-01T04:59:00Z")).toISOString()).toBe(
      "2026-01-01T05:00:00.000Z",
    );
    // 05:00 UTC del 1° de febrero ya es 1° de febrero, 00:00 en Colombia.
    expect(inicioDeMes(new Date("2026-02-01T05:00:00Z")).toISOString()).toBe(
      "2026-02-01T05:00:00.000Z",
    );
  });
});
