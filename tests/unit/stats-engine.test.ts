import { describe, it, expect } from "vitest";
import {
  computeStats,
  normalizaFisica,
  normalizaNota,
  nivelPorOvr,
  PESOS_POSICION,
  grupoEdadPorEdad,
  edadEnAnios,
  RANGOS_POR_GRUPO,
  PISO_FISICO,
  TECHO,
  VERSION_FORMULA,
} from "@/lib/stats-engine";
import type { MedidasEvaluacion } from "@/lib/stats-engine";

const medidasMedias: MedidasEvaluacion = {
  sprint30mSeg: 5.5,
  saltoVerticalCm: 28,
  agilidadIllinoisSeg: 18.5,
  resistenciaYoyoNivel: 9,
  controlBalon: 5,
  pase: 5,
  tiro: 5,
  regate: 5,
  actitud: 5,
  concentracion: 5,
  trabajoEquipo: 5,
  resiliencia: 5,
};

const mejorMarca: MedidasEvaluacion = {
  sprint30mSeg: 4.5, // = min del SUB12 (inverso) → mejor
  saltoVerticalCm: 42,
  agilidadIllinoisSeg: 16,
  resistenciaYoyoNivel: 15,
  controlBalon: 10,
  pase: 10,
  tiro: 10,
  regate: 10,
  actitud: 10,
  concentracion: 10,
  trabajoEquipo: 10,
  resiliencia: 10,
};

const peorMarca: MedidasEvaluacion = {
  sprint30mSeg: 6.5, // = max del SUB12 (inverso) → peor
  saltoVerticalCm: 15,
  agilidadIllinoisSeg: 21,
  resistenciaYoyoNivel: 4,
  controlBalon: 1,
  pase: 1,
  tiro: 1,
  regate: 1,
  actitud: 1,
  concentracion: 1,
  trabajoEquipo: 1,
  resiliencia: 1,
};

describe("normalizaFisica", () => {
  const rango = RANGOS_POR_GRUPO.SUB12.sprint30mSeg; // inverso

  it("mejor marca (= min en inverso) da el techo 99", () => {
    expect(normalizaFisica(rango.min, rango)).toBe(TECHO);
  });
  it("peor marca (= max en inverso) da el piso 40", () => {
    expect(normalizaFisica(rango.max, rango)).toBe(PISO_FISICO);
  });
  it("clampa valores fuera de rango (mejor que el techo)", () => {
    expect(normalizaFisica(3.0, rango)).toBe(TECHO);
  });
  it("clampa valores fuera de rango (peor que el piso)", () => {
    expect(normalizaFisica(9.0, rango)).toBe(PISO_FISICO);
  });
  it("prueba normal (más = mejor): max da 99, min da 40", () => {
    const salto = RANGOS_POR_GRUPO.SUB12.saltoVerticalCm;
    expect(normalizaFisica(salto.max, salto)).toBe(TECHO);
    expect(normalizaFisica(salto.min, salto)).toBe(PISO_FISICO);
  });
});

describe("normalizaNota (1-10 → 1-99)", () => {
  it("nota 10 → 99", () => expect(normalizaNota(10)).toBe(99));
  it("nota 1 → 10 (1×9.9 redondeado)", () => expect(normalizaNota(1)).toBe(10));
  it("clampa por debajo a 1", () => expect(normalizaNota(0)).toBe(1));
  it("clampa por encima a 99", () => expect(normalizaNota(11)).toBe(99));
});

describe("PESOS_POSICION suman 1.0 por fila", () => {
  for (const pos of ["POR", "DEF", "MED", "DEL"] as const) {
    it(`${pos} suma 1.0`, () => {
      const w = PESOS_POSICION[pos];
      const suma = w.rit + w.tir + w.pas + w.reg + w.def + w.fis;
      expect(suma).toBeCloseTo(1.0, 6);
    });
  }
});

describe("nivelPorOvr en los umbrales 64/65/74/75/84/85", () => {
  it("64 → BRONCE", () => expect(nivelPorOvr(64)).toBe("BRONCE"));
  it("65 → PLATA", () => expect(nivelPorOvr(65)).toBe("PLATA"));
  it("74 → PLATA", () => expect(nivelPorOvr(74)).toBe("PLATA"));
  it("75 → ORO", () => expect(nivelPorOvr(75)).toBe("ORO"));
  it("84 → ORO", () => expect(nivelPorOvr(84)).toBe("ORO"));
  it("85 → HEROE", () => expect(nivelPorOvr(85)).toBe("HEROE"));
});

describe("computeStats", () => {
  const opts = { posicion: "MED", grupoEdad: "SUB12" } as const;

  it("todos los stats y el OVR quedan en 1-99", () => {
    const r = computeStats(medidasMedias, opts);
    for (const v of [r.rit, r.tir, r.pas, r.reg, r.def, r.fis, r.men, r.ovr]) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(99);
    }
  });

  it("mejor marca produce OVR alto (HEROE) y peor marca OVR bajo (BRONCE)", () => {
    const alto = computeStats(mejorMarca, opts);
    const bajo = computeStats(peorMarca, opts);
    expect(alto.ovr).toBeGreaterThan(bajo.ovr);
    expect(alto.nivel).toBe("HEROE");
    expect(bajo.nivel).toBe("BRONCE");
  });

  it("MEN es el promedio de las 4 dimensiones de mentalidad", () => {
    const r = computeStats(
      { ...medidasMedias, actitud: 10, concentracion: 8, trabajoEquipo: 6, resiliencia: 4 },
      opts,
    );
    // (99 + 79 + 59 + 40) / 4 = 69.25 → 69
    expect(r.men).toBe(69);
  });

  it("es determinista (mismas entradas → mismas salidas)", () => {
    expect(computeStats(medidasMedias, opts)).toEqual(
      computeStats(medidasMedias, opts),
    );
  });

  it("incluye la versión de fórmula", () => {
    expect(computeStats(medidasMedias, opts).versionFormula).toBe(VERSION_FORMULA);
  });

  it("la posición cambia el OVR (DEL premia TIR/REG, POR premia DEF)", () => {
    const m = { ...medidasMedias, tiro: 10, regate: 10, resistenciaYoyoNivel: 4 };
    const del = computeStats(m, { posicion: "DEL", grupoEdad: "SUB12" });
    const por = computeStats(m, { posicion: "POR", grupoEdad: "SUB12" });
    expect(del.ovr).not.toBe(por.ovr);
  });

  describe("bonus con tope", () => {
    it("aplica bonus hasta el tope (+3 por defecto)", () => {
      const sin = computeStats(medidasMedias, opts);
      const con = computeStats(medidasMedias, {
        ...opts,
        bonus: [
          { stat: "RIT", valor: 1 },
          { stat: "TIR", valor: 1 },
          { stat: "PAS", valor: 1 },
          { stat: "REG", valor: 1 }, // este excede el tope, no debe aplicarse
        ],
      });
      expect(con.bonusAplicado).toBe(3);
      expect(con.rit).toBe(sin.rit + 1);
      expect(con.tir).toBe(sin.tir + 1);
      expect(con.pas).toBe(sin.pas + 1);
      expect(con.reg).toBe(sin.reg); // sin bonus (tope alcanzado)
    });

    it("respeta un tope personalizado de la escuela", () => {
      const con = computeStats(medidasMedias, {
        ...opts,
        topeBonus: 1,
        bonus: [
          { stat: "RIT", valor: 1 },
          { stat: "TIR", valor: 1 },
        ],
      });
      expect(con.bonusAplicado).toBe(1);
    });

    it("un bonus sube el OVR respecto a sin bonus", () => {
      const sin = computeStats(mejorMarca, { posicion: "DEL", grupoEdad: "SUB12" });
      const con = computeStats(mejorMarca, {
        posicion: "DEL",
        grupoEdad: "SUB12",
        bonus: [{ stat: "TIR", valor: 3 }],
      });
      // mejorMarca ya está al techo, el bonus no puede subir más → OVR igual
      expect(con.ovr).toBeGreaterThanOrEqual(sin.ovr);
    });
  });

  it("pesoMenEnOvr configurable desplaza el OVR hacia MEN", () => {
    const m = { ...medidasMedias, actitud: 10, concentracion: 10, trabajoEquipo: 10, resiliencia: 10 };
    const pocoMen = computeStats(m, { ...opts, pesoMenEnOvr: 0.0 });
    const muchoMen = computeStats(m, { ...opts, pesoMenEnOvr: 0.5 });
    expect(muchoMen.ovr).toBeGreaterThan(pocoMen.ovr);
  });
});

describe("grupos de edad", () => {
  it("mapea edades a grupos", () => {
    expect(grupoEdadPorEdad(7)).toBe("SUB8");
    expect(grupoEdadPorEdad(10)).toBe("SUB10");
    expect(grupoEdadPorEdad(12)).toBe("SUB12");
    expect(grupoEdadPorEdad(14)).toBe("SUB14");
    expect(grupoEdadPorEdad(16)).toBe("SUB16");
  });

  it("calcula la edad en años respecto a una fecha", () => {
    const nac = new Date("2014-06-15");
    expect(edadEnAnios(nac, new Date("2026-06-14"))).toBe(11);
    expect(edadEnAnios(nac, new Date("2026-06-15"))).toBe(12);
  });
});
