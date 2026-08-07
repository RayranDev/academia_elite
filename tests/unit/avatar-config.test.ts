import { describe, it, expect } from "vitest";
import {
  avatarDesdeSeed,
  mapV1aV2,
  parseAvatarConfig,
  type AvatarConfigV1,
} from "@/lib/avatar/config";
import {
  avatarDataUri,
  HAIR,
  REAR_HAIR,
  BEARD,
  EYES,
  SKIN,
} from "@/lib/avatar/toon-head";

// Semillas variadas para observar la DISTRIBUCIÓN del pelo largo, no un caso
// suelto: el bug original era justamente que una sola rama valía para todos.
const SEMILLAS = Array.from({ length: 40 }, (_, i) => `jugador-${i}`);

describe("avatarDesdeSeed", () => {
  it("es determinista y produce índices en rango", () => {
    const a = avatarDesdeSeed("Lucas García");
    const b = avatarDesdeSeed("Lucas García");
    expect(a).toEqual(b);
    expect(a.v).toBe(2);
    expect(a.hair).toBeGreaterThanOrEqual(0);
    expect(a.hair).toBeLessThan(HAIR.length);
    expect(a.eyes).toBeLessThan(EYES.length);
    expect(a.skinColor).toBeLessThan(SKIN.length);
  });

  it("sigue siendo determinista con género", () => {
    expect(avatarDesdeSeed("Ana Ruiz", "F")).toEqual(avatarDesdeSeed("Ana Ruiz", "F"));
    expect(avatarDesdeSeed("Ana Ruiz")).toEqual(avatarDesdeSeed("Ana Ruiz", null));
  });

  it("F siempre lleva pelo largo", () => {
    for (const seed of SEMILLAS) {
      const cfg = avatarDesdeSeed(seed, "F");
      expect(cfg.rearHair).toBeGreaterThanOrEqual(0);
      expect(cfg.rearHair).toBeLessThan(REAR_HAIR.length);
    }
  });

  it("M nunca lleva pelo largo", () => {
    for (const seed of SEMILLAS) {
      expect(avatarDesdeSeed(seed, "M").rearHair).toBe(-1);
    }
  });

  it("sin género declarado el pelo largo VARÍA por seed (no siempre -1)", () => {
    // El bug original: `rearHair: -1` fijo hacía que toda jugadora sin foto
    // recibiera un avatar masculino. Sin dato, el pelo tiene que variar.
    const valores = SEMILLAS.map((s) => avatarDesdeSeed(s).rearHair);
    expect(valores.some((v) => v >= 0)).toBe(true);
    expect(valores.some((v) => v === -1)).toBe(true);
    expect(valores.every((v) => v >= -1 && v < REAR_HAIR.length)).toBe(true);
  });

  it("X se comporta como 'sin declarar': también varía", () => {
    const valores = SEMILLAS.map((s) => avatarDesdeSeed(s, "X").rearHair);
    expect(valores.some((v) => v >= 0)).toBe(true);
    expect(valores.some((v) => v === -1)).toBe(true);
  });

  it("nunca pone barba: son menores", () => {
    for (const genero of ["M", "F", "X", undefined] as const) {
      expect(avatarDesdeSeed("Kevin", genero).beard).toBe(-1);
    }
  });
});

describe("mapV1aV2", () => {
  it("migra una config v1 a índices v2 válidos", () => {
    const v1: AvatarConfigV1 = { genero: "F", piel: 2, peinado: 1, cabello: 3 };
    const v2 = mapV1aV2(v1);
    expect(v2.v).toBe(2);
    expect(v2.hair).toBeLessThan(HAIR.length);
    expect(v2.rearHair).toBeGreaterThanOrEqual(0); // F → pelo largo
    expect(v2.beard).toBe(-1);
    expect(v2.skinColor).toBeLessThan(SKIN.length);
  });

  it("sin pelo largo para género M", () => {
    expect(mapV1aV2({ genero: "M", piel: 0, peinado: 0, cabello: 0 }).rearHair).toBe(-1);
  });
});

describe("parseAvatarConfig", () => {
  it("devuelve null para entradas inválidas", () => {
    expect(parseAvatarConfig(null)).toBeNull();
    expect(parseAvatarConfig("{no json")).toBeNull();
    expect(parseAvatarConfig("{}")).toBeNull();
  });

  it("migra v1 guardada", () => {
    const raw = JSON.stringify({ genero: "M", piel: 1, peinado: 2, cabello: 0 });
    const cfg = parseAvatarConfig(raw);
    expect(cfg?.v).toBe(2);
  });

  it("normaliza v2 y recorta índices fuera de rango", () => {
    const raw = JSON.stringify({ v: 2, hair: 999, rearHair: -1, beard: 0, eyes: 0, eyebrows: 0, mouth: 0, clothes: 0, skinColor: 0, hairColor: 0, clothesColor: 0 });
    const cfg = parseAvatarConfig(raw);
    expect(cfg?.hair).toBe(0); // recortado
    expect(cfg?.rearHair).toBe(-1);
  });
});

describe("avatarDataUri", () => {
  it("genera un SVG no vacío con cada componente fijado", () => {
    const cfg = {
      v: 2 as const,
      hair: 0,
      rearHair: REAR_HAIR.length > 0 ? 0 : -1,
      beard: BEARD.length > 0 ? 0 : -1,
      eyes: 0,
      eyebrows: 0,
      mouth: 0,
      clothes: 0,
      skinColor: 0,
      hairColor: 0,
      clothesColor: 0,
    };
    const uri = avatarDataUri(cfg, "semilla");
    expect(uri.startsWith("data:image/svg+xml")).toBe(true);
    expect(uri.length).toBeGreaterThan(100);
  });

  it("sin barba ni pelo largo también renderiza", () => {
    const cfg = {
      v: 2 as const, hair: 0, rearHair: -1, beard: -1, eyes: 0, eyebrows: 0,
      mouth: 0, clothes: 0, skinColor: 0, hairColor: 0, clothesColor: 0,
    };
    expect(avatarDataUri(cfg, "x").startsWith("data:image/svg+xml")).toBe(true);
  });
});
