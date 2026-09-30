import { describe, it, expect } from "vitest";
import {
  faseSesionHoy,
  accionPrincipalHoy,
  hrefPasarLista,
  eventoDestacadoId,
  type FaseSesionHoy,
} from "@/lib/eventos/hoy";
import {
  inicioDeDiaEscuela,
  diaSiguienteISO,
  rangoDelDiaEscuela,
} from "@/lib/fecha-calendario";

const base = { cancelado: false, sesionIniciadaAt: null, sesionCerradaAt: null };

describe("faseSesionHoy", () => {
  it("sin iniciar ni cerrar es POR_INICIAR", () => {
    expect(faseSesionHoy(base)).toBe("POR_INICIAR");
  });

  it("iniciada y no cerrada es EN_CURSO", () => {
    expect(
      faseSesionHoy({ ...base, sesionIniciadaAt: "2026-08-12T22:00:00.000Z" }),
    ).toBe("EN_CURSO");
  });

  it("cerrada gana sobre iniciada", () => {
    expect(
      faseSesionHoy({
        ...base,
        sesionIniciadaAt: "2026-08-12T22:00:00.000Z",
        sesionCerradaAt: "2026-08-12T23:30:00.000Z",
      }),
    ).toBe("CERRADA");
  });

  it("cancelado gana sobre todo lo demás", () => {
    expect(
      faseSesionHoy({
        cancelado: true,
        sesionIniciadaAt: "2026-08-12T22:00:00.000Z",
        sesionCerradaAt: "2026-08-12T23:30:00.000Z",
      }),
    ).toBe("CANCELADA");
  });
});

describe("accionPrincipalHoy", () => {
  it("iniciar y continuar entran al Modo Sesión; solo cambia la etiqueta", () => {
    expect(accionPrincipalHoy("ev1", "POR_INICIAR")).toEqual({
      etiqueta: "Iniciar sesión",
      href: "/dt/eventos/ev1/sesion",
    });
    expect(accionPrincipalHoy("ev1", "EN_CURSO")).toEqual({
      etiqueta: "Continuar sesión",
      href: "/dt/eventos/ev1/sesion",
    });
  });

  it("una sesión cerrada va al resumen, no al Modo Sesión (que no se reabre)", () => {
    expect(accionPrincipalHoy("ev1", "CERRADA")).toEqual({
      etiqueta: "Ver resumen",
      href: "/dt/eventos/ev1",
    });
  });

  it("un evento cancelado no tiene acción principal", () => {
    expect(accionPrincipalHoy("ev1", "CANCELADA")).toBeNull();
  });
});

describe("hrefPasarLista", () => {
  it("apunta al ancla del formulario de asistencia del detalle", () => {
    expect(hrefPasarLista("ev1")).toBe("/dt/eventos/ev1#pasar-lista");
  });
});

describe("eventoDestacadoId", () => {
  const e = (id: string, fase: FaseSesionHoy) => ({ id, fase });

  it("prefiere el que está en curso aunque haya otro por iniciar antes", () => {
    expect(
      eventoDestacadoId([e("a", "POR_INICIAR"), e("b", "EN_CURSO")]),
    ).toBe("b");
  });

  it("sin nada en curso, el primero por iniciar (la lista viene por hora)", () => {
    expect(
      eventoDestacadoId([e("a", "CERRADA"), e("b", "POR_INICIAR"), e("c", "POR_INICIAR")]),
    ).toBe("b");
  });

  it("si todo está cerrado o cancelado, no hay foco", () => {
    expect(eventoDestacadoId([e("a", "CERRADA"), e("b", "CANCELADA")])).toBeNull();
    expect(eventoDestacadoId([])).toBeNull();
  });
});

describe("rango del día de la escuela", () => {
  it("el día de Bogotá empieza a las 05:00 UTC", () => {
    expect(inicioDeDiaEscuela("2026-08-12").toISOString()).toBe(
      "2026-08-12T05:00:00.000Z",
    );
  });

  it("diaSiguienteISO cruza fin de mes y de año", () => {
    expect(diaSiguienteISO("2026-08-31")).toBe("2026-09-01");
    expect(diaSiguienteISO("2026-12-31")).toBe("2027-01-01");
  });

  it("a las 20:00 en Bogotá (01:00 UTC) todavía es el mismo día de la escuela", () => {
    // Caso que rompía con setHours(0,0,0,0) en un servidor UTC.
    const { desde, hasta } = rangoDelDiaEscuela(new Date("2026-08-13T01:00:00.000Z"));
    expect(desde.toISOString()).toBe("2026-08-12T05:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-08-13T04:59:59.999Z");
  });

  it("un entrenamiento a las 19:30 hora Colombia cae dentro del día", () => {
    const { desde, hasta } = rangoDelDiaEscuela(new Date("2026-08-12T15:00:00.000Z"));
    const evento = new Date("2026-08-13T00:30:00.000Z"); // 19:30 en Bogotá
    expect(evento >= desde && evento <= hasta).toBe(true);
  });

  it("a las 00:30 en Bogotá ya es el día siguiente", () => {
    const { desde } = rangoDelDiaEscuela(new Date("2026-08-13T05:30:00.000Z"));
    expect(desde.toISOString()).toBe("2026-08-13T05:00:00.000Z");
  });
});
