import { describe, it, expect } from "vitest";
import {
  periodoDe,
  periodoCerrado,
  estadoEfectivo,
  netoCuota,
  estadoCuenta,
  condicionEstadoEfectivo,
  resolverDescuento,
  type CuotaParaDeuda,
  type EstadoCuota,
  type DescuentoAplicable,
} from "@/lib/cobranza";

// Cobranza derivada (Track A · A.3 y A.4). El estado de una cuota y la deuda de
// un jugador se CALCULAN: si dependieran de que alguien se acuerde de marcarlos,
// estarían mal justo el día que la escuela necesita reclamar.

// Instantes en UTC explicitos: la libreria calcula en la hora de la escuela
// (UTC-5), asi que un `new Date(2026, 6, 15)` local haria que el resultado
// dependiera del huso de la maquina que corre los tests.
const HOY = new Date("2026-07-15T12:00:00Z");

function cuota(p: Partial<CuotaParaDeuda>): CuotaParaDeuda {
  return {
    periodo: "2026-07",
    concepto: "MENSUALIDAD",
    estado: "PENDIENTE",
    monto: 45000,
    descuento: null,
    ...p,
  };
}

describe("periodoDe", () => {
  it("arma AAAA-MM con el mes en dos dígitos", () => {
    expect(periodoDe(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01");
    expect(periodoDe(new Date("2026-12-15T12:00:00Z"))).toBe("2026-12");
  });

  // El caso que motiva toda la función: el servidor de Vercel corre en UTC.
  it("no adelanta el mes por las últimas horas del día en Colombia", () => {
    // 31 de enero, 19:00 en Colombia = 1 de febrero 00:00 UTC. Sigue siendo enero.
    expect(periodoDe(new Date("2026-02-01T00:00:00Z"))).toBe("2026-01");
    // 31 de enero, 23:59 Colombia = 1 de febrero 04:59 UTC. Todavía enero.
    expect(periodoDe(new Date("2026-02-01T04:59:00Z"))).toBe("2026-01");
    // 1 de febrero, 00:00 Colombia = 05:00 UTC. Recién ahí cambia.
    expect(periodoDe(new Date("2026-02-01T05:00:00Z"))).toBe("2026-02");
  });

  it("cruza el año con el mismo criterio", () => {
    expect(periodoDe(new Date("2027-01-01T04:00:00Z"))).toBe("2026-12");
    expect(periodoDe(new Date("2027-01-01T05:00:00Z"))).toBe("2027-01");
  });
});

describe("estadoEfectivo — frontera de fin de mes", () => {
  it("una cuota de enero NO vence en las últimas horas del 31 en Colombia", () => {
    const casiFebrero = new Date("2026-02-01T04:00:00Z"); // 31/01 23:00 en Colombia
    expect(estadoEfectivo("PENDIENTE", "2026-01", casiFebrero)).toBe("PENDIENTE");
  });
  it("vence recién cuando febrero arranca en Colombia", () => {
    const febrero = new Date("2026-02-01T05:00:00Z"); // 01/02 00:00 en Colombia
    expect(estadoEfectivo("PENDIENTE", "2026-01", febrero)).toBe("VENCIDA");
  });
});

describe("periodoCerrado", () => {
  it("el mes en curso no está cerrado", () => {
    expect(periodoCerrado("2026-07", HOY)).toBe(false);
  });
  it("un mes anterior sí, incluso cruzando el año", () => {
    expect(periodoCerrado("2026-06", HOY)).toBe(true);
    expect(periodoCerrado("2025-12", HOY)).toBe(true);
  });
  it("un mes futuro no", () => {
    expect(periodoCerrado("2026-08", HOY)).toBe(false);
  });
  it("ordena bien septiembre contra octubre (el caso que rompe el orden textual ingenuo)", () => {
    // "2026-9" < "2026-10" sería falso como texto; por eso el mes va en 2 dígitos.
    expect(periodoCerrado("2026-09", new Date("2026-10-15T12:00:00Z"))).toBe(true);
  });
});

describe("estadoEfectivo", () => {
  it("PAGADA manda siempre, aunque el período haya cerrado", () => {
    expect(estadoEfectivo("PAGADA", "2026-01", HOY)).toBe("PAGADA");
  });
  it("una pendiente del mes en curso sigue pendiente", () => {
    expect(estadoEfectivo("PENDIENTE", "2026-07", HOY)).toBe("PENDIENTE");
  });
  it("una pendiente de un mes cerrado vence sola, sin que nadie la toque", () => {
    expect(estadoEfectivo("PENDIENTE", "2026-06", HOY)).toBe("VENCIDA");
  });
  it("respeta un VENCIDA ya guardado (datos previos al cálculo derivado)", () => {
    expect(estadoEfectivo("VENCIDA", "2026-07", HOY)).toBe("VENCIDA");
  });
});

describe("netoCuota", () => {
  it("resta el descuento", () => {
    expect(netoCuota(cuota({ monto: 45000, descuento: 5000 }))).toBe(40000);
  });
  it("sin monto no hay neto (no se inventa un cero)", () => {
    expect(netoCuota(cuota({ monto: null }))).toBeNull();
  });
  it("un monto de 0 sigue siendo 0, no null", () => {
    expect(netoCuota(cuota({ monto: 0 }))).toBe(0);
  });
});

describe("estadoCuenta", () => {
  it("sin cuotas no hay mora", () => {
    expect(estadoCuenta([], HOY)).toEqual({
      cuotasVencidas: 0,
      montoVencido: 0,
      cuotasPendientes: 0,
      desdePeriodo: null,
      enMora: false,
    });
  });

  it("la cuota del mes en curso es pendiente, NO deuda", () => {
    const r = estadoCuenta([cuota({ periodo: "2026-07" })], HOY);
    expect(r.enMora).toBe(false);
    expect(r.cuotasPendientes).toBe(1);
    expect(r.montoVencido).toBe(0);
  });

  it("suma los netos de los meses cerrados e impagos", () => {
    const r = estadoCuenta(
      [
        cuota({ periodo: "2026-05", monto: 45000 }),
        cuota({ periodo: "2026-06", monto: 45000, descuento: 5000 }),
        cuota({ periodo: "2026-07" }), // en curso: no es deuda
      ],
      HOY,
    );
    expect(r.cuotasVencidas).toBe(2);
    expect(r.montoVencido).toBe(85000);
    expect(r.cuotasPendientes).toBe(1);
    expect(r.desdePeriodo).toBe("2026-05");
    expect(r.enMora).toBe(true);
  });

  it("las pagadas no cuentan, aunque sean viejas", () => {
    const r = estadoCuenta(
      [
        cuota({ periodo: "2026-05", estado: "PAGADA" }),
        cuota({ periodo: "2026-06", estado: "PAGADA" }),
      ],
      HOY,
    );
    expect(r.enMora).toBe(false);
    expect(r.montoVencido).toBe(0);
    expect(r.desdePeriodo).toBeNull();
  });

  it("una cuota vencida sin monto cuenta como deuda pero no infla el total", () => {
    // Es el caso del jugador cuya categoría no tenía precio al generar.
    const r = estadoCuenta([cuota({ periodo: "2026-06", monto: null })], HOY);
    expect(r.cuotasVencidas).toBe(1);
    expect(r.montoVencido).toBe(0);
    expect(r.enMora).toBe(true);
  });

  it("`desdePeriodo` es el más viejo impago, sin importar el orden de entrada", () => {
    const r = estadoCuenta(
      [
        cuota({ periodo: "2026-06" }),
        cuota({ periodo: "2026-03" }),
        cuota({ periodo: "2026-05" }),
      ],
      HOY,
    );
    expect(r.desdePeriodo).toBe("2026-03");
  });

  it("cuenta conceptos distintos del mismo mes por separado", () => {
    const r = estadoCuenta(
      [
        cuota({ periodo: "2026-06", concepto: "MENSUALIDAD", monto: 45000 }),
        cuota({ periodo: "2026-06", concepto: "INDUMENTARIA", monto: 80000 }),
      ],
      HOY,
    );
    expect(r.cuotasVencidas).toBe(2);
    expect(r.montoVencido).toBe(125000);
  });
});

describe("condicionEstadoEfectivo", () => {
  // Fila mínima: lo que la condición evalúa (`estado`/`periodo` crudos).
  interface FilaCruda {
    estado: string;
    periodo: string;
  }

  /**
   * Aplica "a mano", en JS, la misma forma de condición que devuelve
   * `condicionEstadoEfectivo`: comparaciones de igualdad, `{ lt }`/`{ gte }`
   * sobre `periodo`, y `OR` de sub-condiciones. No reimplementa el criterio de
   * negocio — solo interpreta la forma del objeto — así que si el objeto que
   * devuelve la función cambia de forma sin que el criterio sea equivalente a
   * `estadoEfectivo`, el test lo detecta.
   */
  function matchea(fila: FilaCruda, condicion: Record<string, unknown>): boolean {
    if ("OR" in condicion) {
      const ramas = condicion.OR as Record<string, unknown>[];
      return ramas.some((rama) => matchea(fila, rama));
    }
    for (const [campo, valor] of Object.entries(condicion)) {
      const actual = fila[campo as keyof FilaCruda];
      if (valor != null && typeof valor === "object") {
        const op = valor as { lt?: string; gte?: string };
        if (op.lt != null && !(actual < op.lt)) return false;
        if (op.gte != null && !(actual >= op.gte)) return false;
      } else if (actual !== valor) {
        return false;
      }
    }
    return true;
  }

  const FILAS: FilaCruda[] = [
    { estado: "PAGADA", periodo: "2026-05" }, // pagada de un mes cerrado
    { estado: "PAGADA", periodo: "2026-07" }, // pagada del mes en curso
    { estado: "PENDIENTE", periodo: "2026-07" }, // pendiente del mes en curso: sigue PENDIENTE
    { estado: "PENDIENTE", periodo: "2026-06" }, // pendiente de un mes YA CERRADO: es VENCIDA (A.3)
    { estado: "PENDIENTE", periodo: "2026-08" }, // pendiente de un mes futuro: sigue PENDIENTE
    { estado: "VENCIDA", periodo: "2026-04" }, // vencida ya guardada
  ];

  const ESTADOS: EstadoCuota[] = ["PENDIENTE", "PAGADA", "VENCIDA"];

  for (const estadoObjetivo of ESTADOS) {
    it(`da el mismo resultado que estadoEfectivo fila por fila para ${estadoObjetivo}`, () => {
      const condicion = condicionEstadoEfectivo(estadoObjetivo, periodoDe(HOY));
      const porCondicion = FILAS.filter((f) => matchea(f, condicion));
      const porEstadoEfectivo = FILAS.filter(
        (f) => estadoEfectivo(f.estado, f.periodo, HOY) === estadoObjetivo,
      );
      expect(porCondicion).toEqual(porEstadoEfectivo);
    });
  }

  it("la PENDIENTE de un período cerrado aparece bajo VENCIDA y no bajo PENDIENTE", () => {
    const filaVieja: FilaCruda = { estado: "PENDIENTE", periodo: "2026-06" };
    const periodoActual = periodoDe(HOY);

    expect(matchea(filaVieja, condicionEstadoEfectivo("VENCIDA", periodoActual))).toBe(
      true,
    );
    expect(
      matchea(filaVieja, condicionEstadoEfectivo("PENDIENTE", periodoActual)),
    ).toBe(false);
  });
});

describe("resolverDescuento", () => {
  const CATEGORIA = "cat-sub12";

  function regla(p: Partial<DescuentoAplicable>): DescuentoAplicable {
    return { categoriaId: CATEGORIA, tipo: "PORCENTAJE", valor: 10, ...p };
  }

  it("sin reglas no hay descuento", () => {
    expect(resolverDescuento([], CATEGORIA, 45000)).toBe(0);
  });

  it("sin reglas de ESA categoría tampoco (aunque haya reglas de otras)", () => {
    const reglas = [regla({ categoriaId: "otra-categoria", valor: 50 })];
    expect(resolverDescuento(reglas, CATEGORIA, 45000)).toBe(0);
  });

  it("una regla porcentaje calcula sobre el monto", () => {
    const reglas = [regla({ tipo: "PORCENTAJE", valor: 20 })];
    expect(resolverDescuento(reglas, CATEGORIA, 45000)).toBe(9000);
  });

  it("una regla de monto fijo aplica el valor tal cual", () => {
    const reglas = [regla({ tipo: "MONTO_FIJO", valor: 5000 })];
    expect(resolverDescuento(reglas, CATEGORIA, 45000)).toBe(5000);
  });

  it("con dos reglas mixtas gana la de MAYOR descuento en pesos, no la de mayor `valor` numérico", () => {
    // El fijo tiene el `valor` numérico más chico (8000 < 10) pero en pesos da
    // más que el 10% de 45000 (4500): si se comparara el `valor` crudo en vez
    // del descuento resultante, ganaría el porcentaje y estaría mal.
    const reglas = [
      regla({ tipo: "PORCENTAJE", valor: 10 }), // 10% de 45000 = 4500
      regla({ tipo: "MONTO_FIJO", valor: 8000 }), // 8000 en pesos
    ];
    expect(resolverDescuento(reglas, CATEGORIA, 45000)).toBe(8000);
  });

  it("una regla que superaría el monto no lo excede (tope)", () => {
    const reglas = [regla({ tipo: "MONTO_FIJO", valor: 999999 })];
    expect(resolverDescuento(reglas, CATEGORIA, 45000)).toBe(45000);
  });
});
