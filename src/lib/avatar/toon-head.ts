import { Style, Avatar } from "@dicebear/core";
import definicion from "@dicebear/styles/toon-head.json";

/**
 * Avatar del jugador con DiceBear v10, estilo "toon-head". Se genera en el
 * propio proceso (nunca una API externa → privacidad de menores). Las listas de
 * opciones se derivan de la propia definición del estilo (única fuente de
 * verdad), de modo que el editor expone exactamente lo que el estilo admite.
 */

// El estilo se construye una sola vez a nivel de módulo (valida y clona).
const estilo = new Style(definicion);

function variantes(componente: string): string[] {
  const comp = definicion.components?.[componente];
  return comp?.variants ? Object.keys(comp.variants) : [];
}
function colores(nombre: string): string[] {
  return definicion.colors?.[nombre]?.values ?? [];
}

// Variantes por componente (orden estable: el de la definición).
export const HAIR = variantes("hair"); // pelo (siempre visible)
export const REAR_HAIR = variantes("rearHair"); // pelo largo trasero (opcional)
export const BEARD = variantes("beard"); // barba (opcional)
export const EYES = variantes("eyes");
export const EYEBROWS = variantes("eyebrows");
export const MOUTH = variantes("mouth");
export const CLOTHES = variantes("clothes");

// Paletas de color (hex con "#"; DiceBear los recibe sin "#").
export const SKIN = colores("skin");
export const HAIR_COLOR = colores("hair");
export const CLOTHES_COLOR = colores("clothes");

/** Etiquetas en español; si falta, se usa el nombre técnico. */
export const ETIQUETA: Record<string, string> = {
  // hair
  bun: "Moño",
  sideComed: "Peinado al lado",
  spiky: "Puntas",
  undercut: "Rapado lateral",
  // rearHair
  longStraight: "Largo liso",
  longWavy: "Largo ondulado",
  neckHigh: "A la nuca",
  shoulderHigh: "Al hombro",
  // beard
  chin: "Perilla",
  chinMoustache: "Perilla y bigote",
  fullBeard: "Barba completa",
  longBeard: "Barba larga",
  moustacheTwirl: "Bigote",
  // eyes
  bow: "Tiernos",
  happy: "Alegres",
  humble: "Humildes",
  wide: "Bien abiertos",
  wink: "Guiño",
  // eyebrows
  angry: "Enojadas",
  neutral: "Neutras",
  raised: "Levantadas",
  sad: "Tristes",
  // mouth
  agape: "Boquiabierto",
  laugh: "Risa",
  smile: "Sonrisa",
  // clothes
  dress: "Vestido",
  openJacket: "Chaqueta abierta",
  shirt: "Camisa",
  tShirt: "Camiseta",
  turtleNeck: "Cuello alto",
};

export function etiqueta(variante: string): string {
  return ETIQUETA[variante] ?? variante;
}

function clampIdx(i: number, n: number): number {
  if (!Number.isFinite(i) || i < 0) return 0;
  return Math.min(Math.floor(i), n - 1);
}
function hex(lista: string[], i: number): string {
  return (lista[clampIdx(i, lista.length)] ?? "#000000").replace("#", "");
}

/** Config v2 del avatar (índices a las listas de este módulo; -1 = ninguno). */
export interface AvatarConfigV2 {
  v: 2;
  hair: number;
  rearHair: number; // -1 = ninguno
  beard: number; // -1 = ninguno
  eyes: number;
  eyebrows: number;
  mouth: number;
  clothes: number;
  skinColor: number;
  hairColor: number;
  clothesColor: number;
}

/** SVG (data URI) del avatar a partir de la config v2. Síncrono (RSC y cliente). */
export function avatarDataUri(cfg: AvatarConfigV2, seed: string): string {
  const opts: Record<string, unknown> = {
    seed,
    hairProbability: 100,
    hairVariant: HAIR[clampIdx(cfg.hair, HAIR.length)],
    eyesVariant: EYES[clampIdx(cfg.eyes, EYES.length)],
    eyebrowsVariant: EYEBROWS[clampIdx(cfg.eyebrows, EYEBROWS.length)],
    mouthVariant: MOUTH[clampIdx(cfg.mouth, MOUTH.length)],
    clothesVariant: CLOTHES[clampIdx(cfg.clothes, CLOTHES.length)],
    skinColor: [hex(SKIN, cfg.skinColor)],
    hairColor: [hex(HAIR_COLOR, cfg.hairColor)],
    clothesColor: [hex(CLOTHES_COLOR, cfg.clothesColor)],
  };
  if (cfg.rearHair >= 0 && REAR_HAIR.length > 0) {
    opts.rearHairProbability = 100;
    opts.rearHairVariant = REAR_HAIR[clampIdx(cfg.rearHair, REAR_HAIR.length)];
  } else {
    opts.rearHairProbability = 0;
  }
  if (cfg.beard >= 0 && BEARD.length > 0) {
    opts.beardProbability = 100;
    opts.beardVariant = BEARD[clampIdx(cfg.beard, BEARD.length)];
  } else {
    opts.beardProbability = 0;
  }
  return new Avatar(estilo, opts).toDataUri();
}
