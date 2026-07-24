import { describe, it, expect } from "vitest";
import {
  PERIODOS,
  siguientesPeriodos,
  puedeAvanzar,
  enJuego,
  aceptaGoles,
  estaFinalizado,
  esPeriodo,
  etiquetaPeriodo,
  accionHacia,
  type Periodo,
} from "@/lib/partido/periodos";

/**
 * Máquina de períodos del partido. Es lógica pura, así que se testea sin BD.
 * Lo que importa: que NO se pueda saltar de cualquier lado a cualquier lado (un
 * toque errado en cancha no debe mandar el partido a penales), y que el reloj
 * corra solo cuando se juega.
 */

describe("recorrido normal (sin alargue)", () => {
  it("va de no iniciado a finalizado por los dos tiempos", () => {
    expect(puedeAvanzar("NO_INICIADO", "PRIMER_TIEMPO")).toBe(true);
    expect(puedeAvanzar("PRIMER_TIEMPO", "ENTRETIEMPO")).toBe(true);
    expect(puedeAvanzar("ENTRETIEMPO", "SEGUNDO_TIEMPO")).toBe(true);
    expect(puedeAvanzar("SEGUNDO_TIEMPO", "FINALIZADO")).toBe(true);
  });
});

describe("desenlaces tras el tiempo reglamentario", () => {
  it("desde el 2do tiempo se puede terminar, ir a alargue o ir a penales", () => {
    expect(siguientesPeriodos("SEGUNDO_TIEMPO")).toEqual([
      "FINALIZADO",
      "ALARGUE_1",
      "PENALES",
    ]);
  });

  it("el alargue tiene sus dos tiempos con descanso en el medio", () => {
    expect(puedeAvanzar("ALARGUE_1", "DESCANSO_ALARGUE")).toBe(true);
    expect(puedeAvanzar("DESCANSO_ALARGUE", "ALARGUE_2")).toBe(true);
  });

  it("tras el alargue todavía puede haber penales", () => {
    expect(siguientesPeriodos("ALARGUE_2")).toEqual(["FINALIZADO", "PENALES"]);
  });

  it("los penales solo pueden terminar el partido", () => {
    expect(siguientesPeriodos("PENALES")).toEqual(["FINALIZADO"]);
  });
});

describe("transiciones inválidas (la red que protege al DT en cancha)", () => {
  it("no se puede saltar del 1er tiempo a penales", () => {
    expect(puedeAvanzar("PRIMER_TIEMPO", "PENALES")).toBe(false);
  });

  it("no se puede saltar el entretiempo", () => {
    expect(puedeAvanzar("PRIMER_TIEMPO", "SEGUNDO_TIEMPO")).toBe(false);
  });

  it("no se puede volver atrás", () => {
    expect(puedeAvanzar("SEGUNDO_TIEMPO", "PRIMER_TIEMPO")).toBe(false);
    expect(puedeAvanzar("FINALIZADO", "SEGUNDO_TIEMPO")).toBe(false);
  });

  it("un partido finalizado no avanza a ningún lado", () => {
    expect(siguientesPeriodos("FINALIZADO")).toEqual([]);
    expect(estaFinalizado("FINALIZADO")).toBe(true);
  });
});

describe("reloj y goles", () => {
  it("el reloj corre solo en los tiempos jugados", () => {
    const enMarcha: Periodo[] = [
      "PRIMER_TIEMPO",
      "SEGUNDO_TIEMPO",
      "ALARGUE_1",
      "ALARGUE_2",
    ];
    for (const p of enMarcha) expect(enJuego(p)).toBe(true);
  });

  it("el reloj NO corre en descansos, penales ni antes de empezar", () => {
    const detenido: Periodo[] = [
      "NO_INICIADO",
      "ENTRETIEMPO",
      "DESCANSO_ALARGUE",
      "PENALES",
      "FINALIZADO",
    ];
    for (const p of detenido) expect(enJuego(p)).toBe(false);
  });

  it("en penales no se cargan goles de juego (van al marcador aparte)", () => {
    expect(aceptaGoles("PENALES")).toBe(false);
    expect(aceptaGoles("SEGUNDO_TIEMPO")).toBe(true);
  });
});

describe("guardas y etiquetas", () => {
  it("esPeriodo valida contra la unión", () => {
    expect(esPeriodo("PRIMER_TIEMPO")).toBe(true);
    expect(esPeriodo("TIEMPO_EXTRA_INVENTADO")).toBe(false);
  });

  it("todo período tiene etiqueta y acción legibles", () => {
    for (const p of PERIODOS) {
      expect(etiquetaPeriodo(p).length).toBeGreaterThan(0);
      expect(accionHacia(p).length).toBeGreaterThan(0);
    }
  });
});
