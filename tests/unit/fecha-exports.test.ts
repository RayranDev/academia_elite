import { describe, it, expect } from "vitest";
import {
  diaAFormatoLatino,
  diaDeISO,
  diaEscuelaDe,
  instanteEscuelaTexto,
} from "@/lib/fecha-calendario";

describe("fechas de las planillas (independientes de la zona del servidor)", () => {
  it("un cumpleaños cargado como medianoche UTC conserva su día", () => {
    // z.coerce.date() guarda el <input type=date> como medianoche UTC.
    const nacimiento = new Date("2014-03-09T00:00:00.000Z");
    expect(diaAFormatoLatino(diaDeISO(nacimiento.toISOString()))).toBe("09/03/2014");
  });

  it("un instante de noche en Colombia cae en SU día, no en el siguiente (UTC)", () => {
    // 21:00 del 18/10 en Bogotá = 02:00 del 19/10 en UTC.
    const instante = new Date("2026-10-19T02:00:00.000Z");
    expect(diaAFormatoLatino(diaEscuelaDe(instante))).toBe("18/10/2026");
  });

  it("el instante de auditoría se muestra en hora de la escuela", () => {
    expect(instanteEscuelaTexto(new Date("2026-10-19T02:05:09.000Z"))).toBe(
      "2026-10-18 21:05:09",
    );
  });

  it("la medianoche de Bogotá no se confunde con el día anterior", () => {
    expect(diaEscuelaDe(new Date("2026-10-19T05:00:00.000Z"))).toBe("2026-10-19");
  });
});
