import type { AvatarConfig } from "@/types";

// Paletas (los índices se guardan en AvatarConfig).
export const PIEL = ["#f8d9c0", "#f0c4a0", "#e0a878", "#c68642", "#8d5524", "#5c3a21"];
export const CABELLO = ["#1f1a17", "#5a3a22", "#a9763f", "#e6c35c", "#b34b3a", "#cfcfcf"];
export const PEINADOS_COUNT = 6;

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

function Peinado({ i, color }: { i: number; color: string }) {
  switch (i % PEINADOS_COUNT) {
    case 0: // corto
      return <path d="M30 44 Q50 18 70 44 Q72 30 50 26 Q28 30 30 44Z" fill={color} />;
    case 1: // rapado
      return <path d="M32 42 Q50 24 68 42 Q66 34 50 32 Q34 34 32 42Z" fill={color} />;
    case 2: // tupido / afro
      return <ellipse cx="50" cy="34" rx="26" ry="20" fill={color} />;
    case 3: // con flequillo
      return (
        <path d="M28 46 Q30 22 50 22 Q70 22 72 46 Q66 36 58 40 Q54 32 50 40 Q46 32 42 40 Q34 36 28 46Z" fill={color} />
      );
    case 4: // largo a los lados
      return (
        <path d="M26 64 Q24 26 50 24 Q76 26 74 64 Q70 60 68 44 Q66 32 50 30 Q34 32 32 44 Q30 60 26 64Z" fill={color} />
      );
    case 5: // coleta / recogido
      return (
        <>
          <path d="M30 44 Q50 20 70 44 Q72 30 50 26 Q28 30 30 44Z" fill={color} />
          <circle cx="74" cy="40" r="7" fill={color} />
        </>
      );
    default:
      return null;
  }
}

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
  const piel = PIEL[c.piel % PIEL.length];
  const cabello = CABELLO[c.cabello % CABELLO.length];
  // sombra de piel para el cuello
  const pielSombra = piel;

  return (
    <svg viewBox="0 0 100 120" className={className} role="img" aria-label="Avatar del jugador">
      {/* Jersey (color de la escuela vía --brand) */}
      <path d="M14 120 Q16 86 38 78 L50 88 L62 78 Q84 86 86 120 Z" fill="var(--brand)" />
      <path d="M38 78 L50 88 L62 78 L57 74 L43 74 Z" fill="#0d1322" opacity="0.25" />
      {/* Cuello */}
      <rect x="44" y="62" width="12" height="18" rx="5" fill={pielSombra} />
      {/* Orejas */}
      <circle cx="31" cy="46" r="5" fill={piel} />
      <circle cx="69" cy="46" r="5" fill={piel} />
      {/* Cara */}
      <ellipse cx="50" cy="46" rx="20" ry="23" fill={piel} />
      {/* Cabello (detrás+frente) */}
      <Peinado i={c.peinado} color={cabello} />
      {/* Cejas */}
      <rect x="40" y="44" width="7" height="2" rx="1" fill="#3a2a1d" opacity="0.7" />
      <rect x="53" y="44" width="7" height="2" rx="1" fill="#3a2a1d" opacity="0.7" />
      {/* Ojos */}
      <circle cx="43.5" cy="49" r="2.1" fill="#26201b" />
      <circle cx="56.5" cy="49" r="2.1" fill="#26201b" />
      {/* Boca */}
      <path
        d={c.genero === "F" ? "M44 58 Q50 62 56 58" : "M44 58 Q50 61 56 58"}
        stroke="#7a4a3a"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
