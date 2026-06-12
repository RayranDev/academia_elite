import { describe, it, expect } from "vitest";
import {
  HABITOS,
  XP_POR_HABITO,
  XP_POR_NIVEL,
  VENTANA_SEMANAS,
  inicioSemanaISO,
  xpDeSemana,
  xpTotal,
  nivelPersonal,
  calcularAtributos,
  type SemanaHabitos,
} from "@/lib/progreso/engine";

function semana(parcial: Partial<SemanaHabitos> = {}): SemanaHabitos {
  return {
    academico: false,
    comportamiento: false,
    puntualidad: false,
    ayudaCasa: false,
    valores: false,
    ...parcial,
  };
}

const TODO_CUMPLIDO = semana({
  academico: true,
  comportamiento: true,
  puntualidad: true,
  ayudaCasa: true,
  valores: true,
});

describe("inicioSemanaISO", () => {
  it("devuelve el lunes de la semana (semana ISO, lunes a domingo)", () => {
    // 2026-06-11 es jueves → lunes 2026-06-08
    expect(inicioSemanaISO(new Date(2026, 5, 11))).toBe("2026-06-08");
    // el propio lunes se mantiene
    expect(inicioSemanaISO(new Date(2026, 5, 8))).toBe("2026-06-08");
    // domingo pertenece a la semana que empezó el lunes anterior
    expect(inicioSemanaISO(new Date(2026, 5, 14))).toBe("2026-06-08");
  });
});

describe("xpDeSemana / xpTotal", () => {
  it("cada hábito cumplido suma XP_POR_HABITO", () => {
    expect(xpDeSemana(semana())).toBe(0);
    expect(xpDeSemana(semana({ academico: true }))).toBe(XP_POR_HABITO);
    expect(xpDeSemana(TODO_CUMPLIDO)).toBe(HABITOS.length * XP_POR_HABITO);
  });

  it("xpTotal acumula todas las semanas", () => {
    expect(xpTotal([])).toBe(0);
    expect(xpTotal([TODO_CUMPLIDO, semana({ valores: true })])).toBe(
      HABITOS.length * XP_POR_HABITO + XP_POR_HABITO,
    );
  });
});

describe("nivelPersonal", () => {
  it("empieza en nivel 1 con 0 XP", () => {
    expect(nivelPersonal(0)).toEqual({
      nivel: 1,
      xpEnNivel: 0,
      xpParaSubir: XP_POR_NIVEL,
    });
  });

  it("sube de nivel cada XP_POR_NIVEL", () => {
    expect(nivelPersonal(XP_POR_NIVEL).nivel).toBe(2);
    expect(nivelPersonal(XP_POR_NIVEL * 2 + 30)).toEqual({
      nivel: 3,
      xpEnNivel: 30,
      xpParaSubir: XP_POR_NIVEL,
    });
  });

  it("no rompe con XP negativa", () => {
    expect(nivelPersonal(-5).nivel).toBe(1);
  });
});

describe("calcularAtributos", () => {
  it("sin semanas validadas ambos atributos parten en 50", () => {
    expect(calcularAtributos([])).toEqual({ mentalidad: 50, disciplina: 50 });
  });

  it("con todo cumplido llegan al máximo 99", () => {
    expect(calcularAtributos([TODO_CUMPLIDO])).toEqual({
      mentalidad: 99,
      disciplina: 99,
    });
  });

  it("mentalidad sale de académico+valores y disciplina del resto", () => {
    const soloMentalidad = semana({ academico: true, valores: true });
    expect(calcularAtributos([soloMentalidad])).toEqual({
      mentalidad: 99,
      disciplina: 50,
    });

    const soloDisciplina = semana({
      puntualidad: true,
      comportamiento: true,
      ayudaCasa: true,
    });
    expect(calcularAtributos([soloDisciplina])).toEqual({
      mentalidad: 50,
      disciplina: 99,
    });
  });

  it("cumplimiento parcial queda entre 50 y 99", () => {
    const mitad = semana({ academico: true }); // 1 de 2 hábitos de mentalidad
    const { mentalidad } = calcularAtributos([mitad]);
    expect(mentalidad).toBeGreaterThan(50);
    expect(mentalidad).toBeLessThan(99);
  });

  it("solo cuenta la ventana de semanas más recientes", () => {
    const semanas = [
      ...Array.from({ length: VENTANA_SEMANAS }, () => TODO_CUMPLIDO),
      // semanas viejas vacías fuera de la ventana: no deben bajar el atributo
      ...Array.from({ length: 10 }, () => semana()),
    ];
    expect(calcularAtributos(semanas)).toEqual({
      mentalidad: 99,
      disciplina: 99,
    });
  });
});
