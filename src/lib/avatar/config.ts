import {
  HAIR,
  REAR_HAIR,
  BEARD,
  EYES,
  EYEBROWS,
  MOUTH,
  CLOTHES,
  SKIN,
  HAIR_COLOR,
  CLOTHES_COLOR,
  type AvatarConfigV2,
} from "@/lib/avatar/toon-head";

/** Config v1 (estilo "adventurer", anterior). Solo para migración lazy. */
export interface AvatarConfigV1 {
  genero: "M" | "F" | "X";
  piel: number;
  peinado: number;
  cabello: number;
}

const HASH_BASE = 2166136261;
function hash(s: string): number {
  let h = HASH_BASE;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function idxDe(lista: string[], nombre: string): number {
  const i = lista.indexOf(nombre);
  return i >= 0 ? i : 0;
}
function enRango(i: unknown, n: number, min = 0): number {
  return typeof i === "number" && Number.isFinite(i) && i >= min && i < n
    ? Math.floor(i)
    : 0;
}

/** Config determinista a partir de un seed (cuando aún no se editó el avatar). */
export function avatarDesdeSeed(seed: string): AvatarConfigV2 {
  const h = hash(seed);
  const pick = (n: number, div: number) => Math.floor(h / div) % n;
  return {
    v: 2,
    hair: pick(HAIR.length, 3),
    rearHair: -1,
    beard: -1,
    eyes: pick(EYES.length, 7),
    eyebrows: pick(EYEBROWS.length, 11),
    mouth: pick(MOUTH.length, 13),
    clothes: pick(CLOTHES.length, 17),
    skinColor: pick(SKIN.length, 19),
    hairColor: pick(HAIR_COLOR.length, 23),
    clothesColor: pick(CLOTHES_COLOR.length, 29),
  };
}

function esV1(o: Record<string, unknown>): boolean {
  return (
    typeof o.genero === "string" &&
    typeof o.piel === "number" &&
    typeof o.peinado === "number" &&
    typeof o.cabello === "number"
  );
}

/** Migración determinista v1 → v2 (sin tocar BD; el editor guarda v2 al editar). */
export function mapV1aV2(v1: AvatarConfigV1): AvatarConfigV2 {
  return {
    v: 2,
    hair: enRango(v1.peinado, HAIR.length),
    // El pelo largo se asume solo en avatares "F" (aproximación razonable).
    rearHair: v1.genero === "F" ? enRango(v1.peinado, REAR_HAIR.length) : -1,
    beard: -1,
    eyes: idxDe(EYES, "happy"),
    eyebrows: idxDe(EYEBROWS, "raised"),
    mouth: idxDe(MOUTH, "smile"),
    clothes: idxDe(CLOTHES, "tShirt"),
    skinColor: enRango(v1.piel, SKIN.length),
    hairColor: enRango(v1.cabello, HAIR_COLOR.length),
    clothesColor: (enRango(v1.piel, 99) + enRango(v1.cabello, 99)) % CLOTHES_COLOR.length,
  };
}

function normalizarV2(o: Record<string, unknown>): AvatarConfigV2 {
  // rearHair/beard admiten -1 (ninguno) además de 0..n-1.
  const opt = (v: unknown, n: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= -1 && v < n ? v : -1;
  return {
    v: 2,
    hair: enRango(o.hair, HAIR.length),
    rearHair: opt(o.rearHair, REAR_HAIR.length),
    beard: opt(o.beard, BEARD.length),
    eyes: enRango(o.eyes, EYES.length),
    eyebrows: enRango(o.eyebrows, EYEBROWS.length),
    mouth: enRango(o.mouth, MOUTH.length),
    clothes: enRango(o.clothes, CLOTHES.length),
    skinColor: enRango(o.skinColor, SKIN.length),
    hairColor: enRango(o.hairColor, HAIR_COLOR.length),
    clothesColor: enRango(o.clothesColor, CLOTHES_COLOR.length),
  };
}

/**
 * Parsea la config guardada (JSON) a v2: migra v1, normaliza v2 y descarta lo
 * inválido (→ null, el avatar cae al seed). Centralizado (lo usan mappers y
 * servicios).
 */
export function parseAvatarConfig(raw: string | null | undefined): AvatarConfigV2 | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o && o.v === 2) return normalizarV2(o);
    if (o && esV1(o)) return mapV1aV2(o as unknown as AvatarConfigV1);
    return null;
  } catch {
    return null;
  }
}
