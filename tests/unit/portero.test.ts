import { describe, it, expect } from "vitest";
import {
  computeStats,
  derivaStats,
  derivaStatsPortero,
  derivaStatsPorPosicion,
} from "@/lib/stats-engine";
import { medidasTecnicas, CLAVES_TECNICAS } from "@/lib/medidas-tecnicas";
import type { MedidasEvaluacion } from "@/lib/stats-engine/types";

// El arquero no es un jugador de campo con otros pesos: sus cuatro notas
// técnicas miden otro oficio (blocaje, distribución, juego aéreo, achique) y por
// eso necesita su propia derivación. Antes, su DEF —su stat de mayor peso— salía
// de `resistencia Yo-Yo + salto + control`.

const NORM = {
  vel: 70,
  pot: 60,
  agi: 80,
  res: 50,
  ctrl: 90, // portero: blocaje
  pasT: 55, // portero: distribución
  tirT: 65, // portero: juego aéreo
  regT: 45, // portero: achique y 1v1
};

describe("derivaStatsPortero", () => {
  it("cada fila pondera exactamente 1.0 (no re-escala el rango)", () => {
    // Con todas las medidas en el mismo valor, cada stat tiene que dar ese valor.
    const plano = { vel: 70, pot: 70, agi: 70, res: 70, ctrl: 70, pasT: 70, tirT: 70, regT: 70 };
    const s = derivaStatsPortero(plano);
    for (const v of Object.values(s)) expect(v).toBeCloseTo(70, 6);
  });

  it("el DEF del arquero lo manda el BLOCAJE, no la resistencia Yo-Yo", () => {
    const base = derivaStatsPortero(NORM);

    // Subir el blocaje mueve el DEF con fuerza...
    const mejorBlocaje = derivaStatsPortero({ ...NORM, ctrl: 99 });
    expect(mejorBlocaje.def).toBeGreaterThan(base.def);

    // ...mientras que la resistencia Yo-Yo ya no lo toca en absoluto.
    const mejorYoyo = derivaStatsPortero({ ...NORM, res: 99 });
    expect(mejorYoyo.def).toBe(base.def);
  });

  it("con la fórmula de campo, en cambio, el Yo-Yo SÍ movía el DEF (el defecto)", () => {
    const base = derivaStats(NORM);
    const mejorYoyo = derivaStats({ ...NORM, res: 99 });
    expect(mejorYoyo.def).toBeGreaterThan(base.def);
  });

  it("el RIT del arquero pesa más la agilidad (achique) que la velocidad pura", () => {
    // Se parte de una base PLANA y se sube cada medida el MISMO delta: comparar
    // sobre NORM mediría el margen que le queda a cada una, no su peso.
    const plano = { ...NORM, vel: 50, agi: 50 };
    const conAgilidad = derivaStatsPortero({ ...plano, agi: 70 });
    const conVelocidad = derivaStatsPortero({ ...plano, vel: 70 });
    expect(conAgilidad.rit).toBeGreaterThan(conVelocidad.rit);
  });

  it("el FIS se mide igual que en un jugador de campo", () => {
    expect(derivaStatsPortero(NORM).fis).toBeCloseTo(derivaStats(NORM).fis, 6);
  });

  it("difiere de la derivación de campo en los stats de oficio", () => {
    const portero = derivaStatsPortero(NORM);
    const campo = derivaStats(NORM);
    expect(portero.def).not.toBeCloseTo(campo.def, 6);
    expect(portero.rit).not.toBeCloseTo(campo.rit, 6);
  });
});

describe("derivaStatsPorPosicion", () => {
  it("solo POR usa la derivación de arquero", () => {
    expect(derivaStatsPorPosicion(NORM, "POR")).toEqual(derivaStatsPortero(NORM));
    for (const p of ["DEF", "MED", "DEL"] as const) {
      expect(derivaStatsPorPosicion(NORM, p)).toEqual(derivaStats(NORM));
    }
  });
});

describe("computeStats — integración por posición", () => {
  const medidas: MedidasEvaluacion = {
    sprint30mSeg: 4.6,
    saltoVerticalCm: 40,
    agilidadIllinoisSeg: 16.2,
    resistenciaYoyoNivel: 12,
    controlBalon: 9,
    pase: 6,
    tiro: 7,
    regate: 5,
    actitud: 8,
    concentracion: 8,
    trabajoEquipo: 8,
    resiliencia: 8,
  };

  it("el mismo jugador da una carta distinta como portero que como defensor", () => {
    const comoPortero = computeStats(medidas, { posicion: "POR", grupoEdad: "SUB12" });
    const comoDefensor = computeStats(medidas, { posicion: "DEF", grupoEdad: "SUB12" });
    expect(comoPortero.def).not.toBe(comoDefensor.def);
  });

  it("un arquero con blocaje alto y regate nulo no queda hundido", () => {
    // El caso real: reflejos de élite, pies flojos. Con la fórmula de campo su
    // DEF dependía del Yo-Yo; ahora refleja lo que sabe hacer.
    const arquero = computeStats(
      { ...medidas, controlBalon: 10, regate: 1, resistenciaYoyoNivel: 4 },
      { posicion: "POR", grupoEdad: "SUB12" },
    );
    expect(arquero.def).toBeGreaterThan(70);
  });

  it("sigue devolviendo stats dentro de rango", () => {
    const r = computeStats(medidas, { posicion: "POR", grupoEdad: "SUB12" });
    for (const v of [r.rit, r.tir, r.pas, r.reg, r.def, r.fis, r.men, r.ovr]) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(99);
    }
  });
});

describe("medidasTecnicas", () => {
  it("el portero puntúa otro oficio, sobre las mismas columnas", () => {
    const por = medidasTecnicas("POR");
    const campo = medidasTecnicas("DEL");
    expect(por.regate.etiqueta).toBe("Achique y 1v1");
    expect(campo.regate.etiqueta).toBe("Regate");
    expect(por.controlBalon.etiqueta).toBe("Blocaje / atajada");
  });

  it("toda clave técnica tiene etiqueta y ayuda en las dos posiciones", () => {
    for (const p of ["POR", "DEF", "MED", "DEL"] as const) {
      const m = medidasTecnicas(p);
      for (const clave of CLAVES_TECNICAS) {
        expect(m[clave].etiqueta.length).toBeGreaterThan(0);
        expect(m[clave].ayuda.length).toBeGreaterThan(0);
      }
    }
  });
});
