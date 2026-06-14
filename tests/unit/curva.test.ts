import { describe, it, expect } from "vitest";
import { CURVA, calcularMenBonus, proyeccionMen } from "@/lib/curva";
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
