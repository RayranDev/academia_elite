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
