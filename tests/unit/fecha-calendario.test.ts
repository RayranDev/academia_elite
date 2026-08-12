import { describe, it, expect } from "vitest";
import {
  ZONA_ESCUELA,
  diaDeISO,
  hoyISO,
  inicioDelDiaEscuela,
  aptoVencido,
} from "@/lib/fecha-calendario";

// El caso que motivó todo esto: un `<input type="date">` manda "2026-08-12",
// `z.coerce.date()` lo guarda como MEDIANOCHE UTC, y tratar eso como instante
// en una zona negativa (Colombia, UTC-5) corría la fecha un día y marcaba el
// apto vencido durante todo su último día válido.
const APTO_12_AGO = "2026-08-12T00:00:00.000Z";

/** El día en Bogotá calculado aparte, para no comparar la función consigo misma. */
function diaEnBogota(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
}

describe("diaDeISO", () => {
  it("toma el día tal como se cargó, sin convertir zonas", () => {
    expect(diaDeISO(APTO_12_AGO)).toBe("2026-08-12");
    expect(diaDeISO("2014-03-10T00:00:00.000Z")).toBe("2014-03-10");
  });
});

describe("hoyISO", () => {
  it("resuelve el día en la zona de la escuela, NO en la del proceso", () => {
    // 2026-08-13 01:00 UTC es todavía el 12 en Bogotá (UTC-5). Este es el caso
    // que rompía: el servidor corre en UTC y daba el 13 por adelantado.
    expect(hoyISO(new Date("2026-08-13T01:00:00.000Z"))).toBe("2026-08-12");
  });

  it("cambia de día recién a las 05:00 UTC (medianoche en Bogotá)", () => {
    expect(hoyISO(new Date("2026-08-13T04:59:00.000Z"))).toBe("2026-08-12");
    expect(hoyISO(new Date("2026-08-13T05:00:00.000Z"))).toBe("2026-08-13");
  });

  it("sin argumentos usa el reloj real y sigue dando el día de Bogotá", () => {
    // Ejercita el camino que corre en producción — el default de `ahora` es el
    // único que se usa de verdad, y era justo el que ningún test tocaba.
    expect(hoyISO()).toBe(diaEnBogota(new Date()));
    expect(ZONA_ESCUELA).toBe("America/Bogota");
  });
});

describe("inicioDelDiaEscuela", () => {
  it("es la medianoche UTC del día que hoy es en la escuela", () => {
    expect(inicioDelDiaEscuela(new Date("2026-08-13T01:00:00.000Z")).toISOString()).toBe(
      "2026-08-12T00:00:00.000Z",
    );
  });

  it("un apto que vence HOY no queda por debajo del corte", () => {
    // Es lo que hace que el KPI del dashboard (`{ lt: hoy }`) no lo cuente
    // como vencido el mismo día en que todavía vale.
    const corte = inicioDelDiaEscuela(new Date("2026-08-12T23:59:00.000Z"));
    expect(new Date(APTO_12_AGO) < corte).toBe(false);
  });

  it("no puede contradecir a `aptoVencido`: los dos salen del mismo día", () => {
    // El badge de la ficha y el contador del dashboard tienen que coincidir en
    // cualquier momento del día, incluida la franja UTC/Bogotá que difiere.
    for (const iso of [
      "2026-08-12T00:30:00.000Z",
      "2026-08-12T12:00:00.000Z",
      "2026-08-13T01:00:00.000Z", // ya es 13 en UTC, todavía 12 en Bogotá
      "2026-08-13T06:00:00.000Z",
    ]) {
      const ahora = new Date(iso);
      const porBadge = aptoVencido(APTO_12_AGO, ahora);
      const porContador = new Date(APTO_12_AGO) < inicioDelDiaEscuela(ahora);
      expect(porContador).toBe(porBadge);
    }
  });
});

describe("aptoVencido", () => {
  it("el día del vencimiento todavía vale, a cualquier hora", () => {
    // Recorre el día del vencimiento hora por hora EN UTC: en ninguna tiene que
    // aparecer como vencido. Antes, comparando instantes, lo estaba en todas.
    for (let h = 0; h < 24; h++) {
      const ahora = new Date(Date.UTC(2026, 7, 12, h, 30));
      // Solo mientras siga siendo el 12 en Bogotá (hasta las 05:00 UTC del 13).
      if (diaEnBogota(ahora) !== "2026-08-12") continue;
      expect(aptoVencido(APTO_12_AGO, ahora)).toBe(false);
    }
  });

  it("sigue válido a la tarde en Colombia aunque en UTC ya sea el día siguiente", () => {
    expect(aptoVencido(APTO_12_AGO, new Date("2026-08-13T01:00:00.000Z"))).toBe(false);
  });

  it("vence recién cuando amanece el día siguiente en la escuela", () => {
    expect(aptoVencido(APTO_12_AGO, new Date("2026-08-13T05:00:00.000Z"))).toBe(true);
  });

  it("no lo marca vencido antes de tiempo", () => {
    expect(aptoVencido(APTO_12_AGO, new Date("2026-08-12T04:00:00.000Z"))).toBe(false);
  });

  it("sin apto cargado no es 'vencido' (null no es lo mismo que vencido)", () => {
    expect(aptoVencido(null)).toBe(false);
    expect(aptoVencido(undefined)).toBe(false);
    expect(aptoVencido("")).toBe(false);
  });
});
