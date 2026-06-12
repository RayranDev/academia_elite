import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";
import type { AvatarConfig, GeneroAvatar } from "@/types";

// Paletas (los índices se guardan en AvatarConfig; hex con "#").
// DiceBear recibe los mismos valores sin el "#".
export const PIEL = ["#f8d9c0", "#f0c4a0", "#e0a878", "#c68642", "#8d5524", "#5c3a21"];
export const CABELLO = ["#1f1a17", "#5a3a22", "#a9763f", "#e6c35c", "#b34b3a", "#cfcfcf"];
export const PEINADOS_COUNT = 6;

// Variantes de peinado del estilo "adventurer" por género (índice = AvatarConfig.peinado).
// `as const` conserva los literales que exige el tipado de DiceBear.
const PEINADOS = {
  M: ["short04", "short12", "short19", "short16", "short07", "short01"],
  F: ["long03", "long07", "long12", "long16", "long20", "long24"],
  X: ["short09", "long01", "short15", "long10", "short05", "long19"],
} as const satisfies Record<GeneroAvatar, readonly string[]>;

const HASH_BASE = 2166136261;

function hash(s: string): number {
  let h = HASH_BASE;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Config determinista a partir de un seed (cuando el jugador aún no la editó). */
export function avatarDesdeSeed(seed: string): AvatarConfig {
  const h = hash(seed);
  return {
    genero: (["M", "F", "X"] as const)[h % 3],
    piel: Math.floor(h / 3) % PIEL.length,
    peinado: Math.floor(h / 7) % PEINADOS_COUNT,
    cabello: Math.floor(h / 13) % CABELLO.length,
  };
}

/**
 * Avatar del jugador generado con DiceBear (estilo "adventurer") en el propio
 * proceso — nunca se llama a una API externa (privacidad de menores).
 * Es el fallback cuando no hay foto real con consentimiento.
 */
export function PlayerAvatar({
  config,
  seed = "jugador",
  className,
}: {
  config?: AvatarConfig | null;
  seed?: string;
  className?: string;
}) {
  const c = config ?? avatarDesdeSeed(seed);
  const peinados = PEINADOS[c.genero] ?? PEINADOS.X;
  const uri = createAvatar(adventurer, {
    seed,
    skinColor: [PIEL[c.piel % PIEL.length].slice(1)],
    hairColor: [CABELLO[c.cabello % CABELLO.length].slice(1)],
    hair: [peinados[c.peinado % PEINADOS_COUNT]],
    hairProbability: 100,
  }).toDataUri();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={uri}
      alt="Avatar del jugador"
      className={className}
      draggable={false}
    />
  );
}
