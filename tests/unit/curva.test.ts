import { describe, it, expect } from "vitest";
import {
  CURVA,
  agregarInsumosPorJugador,
  calcularMenBonus,
  calcularRendimientoBonus,
  proyeccionMen,
} from "@/lib/curva";
import { ovrConMen } from "@/lib/stats-engine";

describe("calcularMenBonus", () => {
  it("sin actividad da 0", () => {
    expect(calcularMenBonus({ entrenos: 0, partidos: 0, ausencias: 0 })).toBe(0);
  });

  it("gana por entrenamientos y partidos", () => {
    // 3 entrenos (3×0.6=1.8) + 2 partidos (2×1.2=2.4) = 4.2
    expect(calcularMenBonus({ entrenos: 3, partidos: 2, ausencias: 0 })).toBeCloseTo(4.2);
  });

  it("no supera el tope", () => {
    expect(
      calcularMenBonus({ entrenos: 100, partidos: 100, ausencias: 0 }),
    ).toBe(CURVA.TOPE_MEN_BONUS);
  });

  it("hasta 2 ausencias NO penaliza", () => {
    const sinFaltas = calcularMenBonus({ entrenos: 5, partidos: 0, ausencias: 0 });
    const con2 = calcularMenBonus({ entrenos: 5, partidos: 0, ausencias: 2 });
    expect(con2).toBe(sinFaltas);
  });

  it("penaliza recién a partir de la 3ª ausencia", () => {
    const con2 = calcularMenBonus({ entrenos: 5, partidos: 0, ausencias: 2 });
    const con3 = calcularMenBonus({ entrenos: 5, partidos: 0, ausencias: 3 });
    expect(con3).toBeLessThan(con2);
    // exceso 1 × PENAL 1.5 → baja 1.5
    expect(con2 - con3).toBeCloseTo(CURVA.PENAL_POR_AUSENCIA);
  });

  it("nunca es negativo", () => {
    expect(
      calcularMenBonus({ entrenos: 0, partidos: 0, ausencias: 50 }),
    ).toBe(0);
  });

  it("es recuperable: volver a asistir vuelve a subir el bonus", () => {
    const frenado = calcularMenBonus({ entrenos: 1, partidos: 0, ausencias: 4 });
    const recuperado = calcularMenBonus({ entrenos: 8, partidos: 2, ausencias: 4 });
    expect(recuperado).toBeGreaterThan(frenado);
  });

  it("sin curva custom usa el default global (retrocompatible)", () => {
    expect(calcularMenBonus({ entrenos: 3, partidos: 2, ausencias: 0 })).toBe(
      calcularMenBonus({ entrenos: 3, partidos: 2, ausencias: 0 }, CURVA),
    );
  });

  it("una curva custom con TOPE_MEN_BONUS distinto cambia el resultado", () => {
    const curvaEscuela = { ...CURVA, TOPE_MEN_BONUS: 5 };
    expect(
      calcularMenBonus({ entrenos: 100, partidos: 100, ausencias: 0 }, curvaEscuela),
    ).toBe(5);
    expect(
      calcularMenBonus({ entrenos: 100, partidos: 100, ausencias: 0 }),
    ).toBe(CURVA.TOPE_MEN_BONUS);
  });

  it("una curva custom con GANANCIA_ENTRENO distinto cambia el resultado", () => {
    const curvaEscuela = { ...CURVA, GANANCIA_ENTRENO: 2 };
    // 3 entrenos × 2 = 6, muy por debajo del tope (12)
    expect(
      calcularMenBonus({ entrenos: 3, partidos: 0, ausencias: 0 }, curvaEscuela),
    ).toBe(6);
    expect(
      calcularMenBonus({ entrenos: 3, partidos: 0, ausencias: 0 }),
    ).not.toBe(6);
  });

  it("una curva custom con UMBRAL_AUSENCIAS distinto cambia cuándo empieza a penalizar", () => {
    const curvaEscuela = { ...CURVA, UMBRAL_AUSENCIAS: 5 };
    // Con el default (umbral 2) 3 ausencias ya penaliza; con umbral 5 no.
    const conDefault = calcularMenBonus({ entrenos: 5, partidos: 0, ausencias: 3 });
    const conCurvaCustom = calcularMenBonus(
      { entrenos: 5, partidos: 0, ausencias: 3 },
      curvaEscuela,
    );
    expect(conCurvaCustom).toBeGreaterThan(conDefault);
  });
});

describe("calcularRendimientoBonus", () => {
  it("sin actividad da 0", () => {
    expect(calcularRendimientoBonus({ goles: 0, asistenciasGol: 0, rojas: 0 })).toBe(0);
  });

  it("gana por goles y asistencias de gol", () => {
    // 2 goles (2×0.5=1.0) + 3 asistencias (3×0.3=0.9) = 1.9
    expect(
      calcularRendimientoBonus({ goles: 2, asistenciasGol: 3, rojas: 0 }),
    ).toBeCloseTo(1.9);
  });

  it("no supera su propio tope, distinto del de asistencia", () => {
    expect(
      calcularRendimientoBonus({ goles: 100, asistenciasGol: 100, rojas: 0 }),
    ).toBe(CURVA.TOPE_RENDIMIENTO_BONUS);
    expect(CURVA.TOPE_RENDIMIENTO_BONUS).not.toBe(CURVA.TOPE_MEN_BONUS);
  });

  it("la roja penaliza, chico y recuperable", () => {
    const sinRoja = calcularRendimientoBonus({ goles: 2, asistenciasGol: 0, rojas: 0 });
    const conRoja = calcularRendimientoBonus({ goles: 2, asistenciasGol: 0, rojas: 1 });
    expect(conRoja).toBeLessThan(sinRoja);
    expect(sinRoja - conRoja).toBeCloseTo(CURVA.PENAL_ROJA);
  });

  it("nunca es negativo", () => {
    expect(
      calcularRendimientoBonus({ goles: 0, asistenciasGol: 0, rojas: 50 }),
    ).toBe(0);
  });

  it("sin curva custom usa el default global (retrocompatible)", () => {
    expect(calcularRendimientoBonus({ goles: 2, asistenciasGol: 3, rojas: 0 })).toBe(
      calcularRendimientoBonus({ goles: 2, asistenciasGol: 3, rojas: 0 }, CURVA),
    );
  });

  it("una curva custom con TOPE_RENDIMIENTO_BONUS distinto cambia el resultado", () => {
    const curvaEscuela = { ...CURVA, TOPE_RENDIMIENTO_BONUS: 2 };
    expect(
      calcularRendimientoBonus({ goles: 100, asistenciasGol: 100, rojas: 0 }, curvaEscuela),
    ).toBe(2);
    expect(
      calcularRendimientoBonus({ goles: 100, asistenciasGol: 100, rojas: 0 }),
    ).toBe(CURVA.TOPE_RENDIMIENTO_BONUS);
  });
});

describe("agregarInsumosPorJugador", () => {
  it("agrega bien por jugador: dos jugadores distintos no se mezclan", () => {
    const mapa = agregarInsumosPorJugador(
      [
        { jugadorId: "a", presente: true, evento: { tipo: "ENTRENAMIENTO" } },
        { jugadorId: "b", presente: true, evento: { tipo: "PARTIDO" } },
      ],
      [
        { jugadorId: "a", goles: 1, asistencias: 0, roja: false },
        { jugadorId: "b", goles: 0, asistencias: 2, roja: true },
      ],
    );
    expect(mapa.get("a")).toEqual({
      asistencia: { entrenos: 1, partidos: 0, ausencias: 0 },
      rendimiento: { goles: 1, asistenciasGol: 0, rojas: 0 },
    });
    expect(mapa.get("b")).toEqual({
      asistencia: { entrenos: 0, partidos: 1, ausencias: 0 },
      rendimiento: { goles: 0, asistenciasGol: 2, rojas: 1 },
    });
  });

  it("combina asistencia + rendimiento del mismo jugador en la misma entrada del mapa", () => {
    const mapa = agregarInsumosPorJugador(
      [
        { jugadorId: "a", presente: true, evento: { tipo: "ENTRENAMIENTO" } },
        { jugadorId: "a", presente: false, evento: { tipo: "PARTIDO" } },
      ],
      [{ jugadorId: "a", goles: 2, asistencias: 1, roja: false }],
    );
    expect(mapa.size).toBe(1);
    expect(mapa.get("a")).toEqual({
      asistencia: { entrenos: 1, partidos: 0, ausencias: 1 },
      rendimiento: { goles: 2, asistenciasGol: 1, rojas: 0 },
    });
  });

  it("un jugador sin ninguna fila no aparece en el mapa", () => {
    const mapa = agregarInsumosPorJugador(
      [{ jugadorId: "a", presente: true, evento: { tipo: "ENTRENAMIENTO" } }],
      [],
    );
    expect(mapa.has("a")).toBe(true);
    expect(mapa.has("sin-actividad")).toBe(false);
  });
});

describe("proyeccionMen", () => {
  it("marca frenado solo con más de 2 ausencias", () => {
    expect(proyeccionMen({ entrenos: 3, partidos: 1, ausencias: 2 }).frenadoPorAusencias).toBe(false);
    expect(proyeccionMen({ entrenos: 3, partidos: 1, ausencias: 3 }).frenadoPorAusencias).toBe(true);
  });
});

describe("ovrConMen", () => {
  const stats = { rit: 80, tir: 80, pas: 80, reg: 80, def: 80, fis: 80 };

  it("con todos los stats iguales, el OVR es ese valor independientemente del MEN si MEN coincide", () => {
    // sumaPos = 80 (pesos suman 1); con men 80 → 80
    expect(ovrConMen(stats, "DEL", 0.1, 80)).toBe(80);
  });

  it("un MEN más alto sube el OVR según el peso de MEN", () => {
    const base = ovrConMen(stats, "DEL", 0.1, 80);
    const conMenAlto = ovrConMen(stats, "DEL", 0.1, 99);
    expect(conMenAlto).toBeGreaterThan(base);
    // (1-0.1)*80 + 0.1*99 = 72 + 9.9 = 81.9 → 82
    expect(conMenAlto).toBe(82);
  });
});
