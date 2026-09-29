import { describe, it, expect } from "vitest";
import { aHistoriaCarta } from "@/lib/mappers/historia-carta";

const JUGADOR = {
  nombre: "Nicolás",
  apellido: "Peralta",
  posicion: "MED",
  dorsal: 8,
  fotoUrl: null,
  genero: "M",
  avatarConfig: null,
};

function statsRow(ovr: number, nivel: string, extra: Partial<Record<string, number>> = {}) {
  return {
    rit: 50,
    tir: 50,
    pas: 50,
    reg: 50,
    def: 50,
    fis: 50,
    men: 50,
    ovr,
    nivel,
    ...extra,
  };
}

describe("aHistoriaCarta", () => {
  it("ignora evaluaciones sin snapshot de stats (anuladas o incompletas)", () => {
    const historia = aHistoriaCarta(
      [
        { fecha: new Date("2026-01-01"), statsCalculados: null },
        { fecha: new Date("2026-02-01"), statsCalculados: statsRow(60, "BRONCE") },
      ],
      JUGADOR,
      null,
    );
    expect(historia).toHaveLength(1);
    expect(historia[0].ovr).toBe(60);
  });

  it("mantiene el orden de entrada (más vieja → más nueva)", () => {
    const historia = aHistoriaCarta(
      [
        { fecha: new Date("2026-01-01"), statsCalculados: statsRow(60, "BRONCE") },
        { fecha: new Date("2026-02-01"), statsCalculados: statsRow(66, "PLATA") },
        { fecha: new Date("2026-03-01"), statsCalculados: statsRow(70, "PLATA") },
      ],
      JUGADOR,
      null,
    );
    expect(historia.map((h) => h.fecha)).toEqual([
      new Date("2026-01-01").toISOString(),
      new Date("2026-02-01").toISOString(),
      new Date("2026-03-01").toISOString(),
    ]);
  });

  it("la primera evaluación no tiene delta ni cambio de nivel", () => {
    const [primera] = aHistoriaCarta(
      [{ fecha: new Date("2026-01-01"), statsCalculados: statsRow(60, "BRONCE") }],
      JUGADOR,
      null,
    );
    expect(primera.delta).toBeNull();
    expect(primera.subioNivel).toBe(false);
    expect(primera.bajoNivel).toBe(false);
  });

  it("calcula el delta de OVR contra la evaluación anterior", () => {
    const historia = aHistoriaCarta(
      [
        { fecha: new Date("2026-01-01"), statsCalculados: statsRow(60, "BRONCE") },
        { fecha: new Date("2026-02-01"), statsCalculados: statsRow(69, "PLATA") },
        { fecha: new Date("2026-03-01"), statsCalculados: statsRow(65, "PLATA") },
      ],
      JUGADOR,
      null,
    );
    expect(historia[1].delta).toBe(9);
    expect(historia[2].delta).toBe(-4);
  });

  it("detecta cuando sube de nivel", () => {
    const historia = aHistoriaCarta(
      [
        { fecha: new Date("2026-01-01"), statsCalculados: statsRow(60, "BRONCE") },
        { fecha: new Date("2026-02-01"), statsCalculados: statsRow(69, "PLATA") },
      ],
      JUGADOR,
      null,
    );
    expect(historia[1].subioNivel).toBe(true);
    expect(historia[1].bajoNivel).toBe(false);
  });

  it("detecta cuando baja de nivel", () => {
    const historia = aHistoriaCarta(
      [
        { fecha: new Date("2026-01-01"), statsCalculados: statsRow(78, "ORO") },
        { fecha: new Date("2026-02-01"), statsCalculados: statsRow(68, "PLATA") },
      ],
      JUGADOR,
      null,
    );
    expect(historia[1].subioNivel).toBe(false);
    expect(historia[1].bajoNivel).toBe(true);
  });

  it("no marca cambio de nivel si se mantiene igual", () => {
    const historia = aHistoriaCarta(
      [
        { fecha: new Date("2026-01-01"), statsCalculados: statsRow(66, "PLATA") },
        { fecha: new Date("2026-02-01"), statsCalculados: statsRow(70, "PLATA") },
      ],
      JUGADOR,
      null,
    );
    expect(historia[1].subioNivel).toBe(false);
    expect(historia[1].bajoNivel).toBe(false);
  });

  it("cada mini-carta usa el snapshot de ESA evaluación, no la última", () => {
    const historia = aHistoriaCarta(
      [
        { fecha: new Date("2026-01-01"), statsCalculados: statsRow(60, "BRONCE", { rit: 40 }) },
        { fecha: new Date("2026-02-01"), statsCalculados: statsRow(80, "ORO", { rit: 90 }) },
      ],
      JUGADOR,
      null,
    );
    expect(historia[0].card.stats.rit).toBe(40);
    expect(historia[0].card.ovr).toBe(60);
    expect(historia[1].card.stats.rit).toBe(90);
    expect(historia[1].card.ovr).toBe(80);
  });

  it("la identidad visual (nombre/foto/posición) es la actual del jugador en todas las mini-cartas", () => {
    const historia = aHistoriaCarta(
      [
        { fecha: new Date("2026-01-01"), statsCalculados: statsRow(60, "BRONCE") },
        { fecha: new Date("2026-02-01"), statsCalculados: statsRow(70, "PLATA") },
      ],
      JUGADOR,
      "/foto/actual.webp",
      "/escudo/actual.png",
    );
    for (const item of historia) {
      expect(item.card.nombre).toBe("Nicolás");
      expect(item.card.apellido).toBe("Peralta");
      expect(item.card.fotoUrl).toBe("/foto/actual.webp");
      expect(item.card.escudoEscuelaUrl).toBe("/escudo/actual.png");
    }
  });
});
