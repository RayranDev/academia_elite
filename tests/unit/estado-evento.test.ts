import { describe, it, expect } from "vitest";
import { estadoDeEvento, permiteVerEstadisticas } from "@/lib/eventos/estado";

/**
 * Estado unificado del evento. Es lógica pura: se testea sin BD. Lo que
 * importa es que cancelado siempre gane, y que PARTIDO se derive del
 * período mientras el resto (sin período propio) se derive de las fechas.
 */

const AHORA = new Date("2026-07-25T18:00:00Z");
const ANTES = new Date("2026-07-25T10:00:00Z");
const DESPUES = new Date("2026-07-26T10:00:00Z");

describe("estadoDeEvento — PARTIDO", () => {
  it("PROGRAMADO cuando el período no arrancó", () => {
    expect(
      estadoDeEvento(
        { tipo: "PARTIDO", cancelado: false, periodo: "NO_INICIADO", sesionCerradaAt: null, inicio: DESPUES, fin: DESPUES },
        AHORA,
      ),
    ).toBe("PROGRAMADO");
  });

  it("EN_CURSO durante cualquier período jugado", () => {
    for (const periodo of ["PRIMER_TIEMPO", "ENTRETIEMPO", "SEGUNDO_TIEMPO", "ALARGUE_1", "PENALES"]) {
      expect(
        estadoDeEvento(
          { tipo: "PARTIDO", cancelado: false, periodo, sesionCerradaAt: null, inicio: ANTES, fin: DESPUES },
          AHORA,
        ),
      ).toBe("EN_CURSO");
    }
  });

  it("FINALIZADO cuando el período es FINALIZADO", () => {
    expect(
      estadoDeEvento(
        { tipo: "PARTIDO", cancelado: false, periodo: "FINALIZADO", sesionCerradaAt: null, inicio: ANTES, fin: ANTES },
        AHORA,
      ),
    ).toBe("FINALIZADO");
  });

  it("FINALIZADO si la sesión ya se cerró, aunque el período quedara raro", () => {
    expect(
      estadoDeEvento(
        { tipo: "PARTIDO", cancelado: false, periodo: "SEGUNDO_TIEMPO", sesionCerradaAt: ANTES, inicio: ANTES, fin: ANTES },
        AHORA,
      ),
    ).toBe("FINALIZADO");
  });

  it("CANCELADO gana sobre cualquier período", () => {
    expect(
      estadoDeEvento(
        { tipo: "PARTIDO", cancelado: true, periodo: "PRIMER_TIEMPO", sesionCerradaAt: null, inicio: ANTES, fin: DESPUES },
        AHORA,
      ),
    ).toBe("CANCELADO");
  });
});

describe("estadoDeEvento — ENTRENAMIENTO/EVALUACION/OTRO (sin período)", () => {
  it("PROGRAMADO antes de que empiece", () => {
    expect(
      estadoDeEvento(
        { tipo: "ENTRENAMIENTO", cancelado: false, sesionCerradaAt: null, inicio: DESPUES, fin: DESPUES },
        AHORA,
      ),
    ).toBe("PROGRAMADO");
  });

  it("EN_CURSO entre inicio y fin", () => {
    expect(
      estadoDeEvento(
        { tipo: "EVALUACION", cancelado: false, sesionCerradaAt: null, inicio: ANTES, fin: DESPUES },
        AHORA,
      ),
    ).toBe("EN_CURSO");
  });

  it("FINALIZADO después de la fecha de fin", () => {
    expect(
      estadoDeEvento(
        { tipo: "OTRO", cancelado: false, sesionCerradaAt: null, inicio: ANTES, fin: ANTES },
        AHORA,
      ),
    ).toBe("FINALIZADO");
  });

  it("cancelado gana aunque esté dentro del rango de fechas", () => {
    expect(
      estadoDeEvento(
        { tipo: "ENTRENAMIENTO", cancelado: true, sesionCerradaAt: null, inicio: ANTES, fin: DESPUES },
        AHORA,
      ),
    ).toBe("CANCELADO");
  });
});

describe("permiteVerEstadisticas", () => {
  it("solo en EN_CURSO y FINALIZADO", () => {
    expect(permiteVerEstadisticas("PROGRAMADO")).toBe(false);
    expect(permiteVerEstadisticas("EN_CURSO")).toBe(true);
    expect(permiteVerEstadisticas("FINALIZADO")).toBe(true);
    expect(permiteVerEstadisticas("CANCELADO")).toBe(false);
  });
});
