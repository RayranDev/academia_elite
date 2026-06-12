import { z } from "zod";
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
} from "@/lib/avatar/toon-head";

// Bounds derivados de la definición del estilo (única fuente de verdad).
const idx = (n: number) => z.coerce.number().int().min(0).max(Math.max(0, n - 1));
// rearHair/beard admiten -1 (ninguno).
const opcional = (n: number) => z.coerce.number().int().min(-1).max(Math.max(0, n - 1));

export const avatarConfigSchema = z.object({
  v: z.literal(2).default(2),
  hair: idx(HAIR.length),
  rearHair: opcional(REAR_HAIR.length),
  beard: opcional(BEARD.length),
  eyes: idx(EYES.length),
  eyebrows: idx(EYEBROWS.length),
  mouth: idx(MOUTH.length),
  clothes: idx(CLOTHES.length),
  skinColor: idx(SKIN.length),
  hairColor: idx(HAIR_COLOR.length),
  clothesColor: idx(CLOTHES_COLOR.length),
});

export type AvatarConfigInput = z.infer<typeof avatarConfigSchema>;
