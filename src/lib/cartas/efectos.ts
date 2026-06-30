import type { EfectoCarta, EfectoParams, TintaMetal, TramaPatron } from "@/types";

// Motor de efectos de fondo de carta (módulo PURO — sin React ni Prisma).
//
// Un fondo equipado puede declarar un `efecto` que apila "capas" visuales sobre
// el `estilo` base de la carta. `PlayerCard` lee estas capas y las pinta como
// divs absolutos. Sacar la lógica visual del componente la hace testeable y
// determinista (mismas entradas → mismas capas).
//
// Reglas de diseño (importantes):
//  - El estado BASE (capas estáticas) debe verse profesional SIN depender de
//    `mix-blend-mode`, porque la exportación PNG (html-to-image) rasteriza en un
//    `<foreignObject>` donde los blend-modes no son fiables. El blend es realce,
//    no requisito: las opacidades/colores ya dan un resultado decente sin él.
//  - Las capas ANIMADAS solo se montan en la carta hero on-screen; nunca entran
//    en el PNG. Por eso la animación es un plus, no la lectura principal.

export type { EfectoCarta, EfectoParams, TintaMetal, TramaPatron };

type BlendMode =
  | "normal"
  | "overlay"
  | "screen"
  | "soft-light"
  | "color-dodge"
  | "multiply"
  | "lighten";

// Una capa = un div absoluto que PlayerCard pinta sobre el fondo base.
export interface CapaEfecto {
  key: string;
  background?: string; // CSS background (gradiente / data-URI)
  backgroundSize?: string;
  blendMode?: BlendMode; // realce on-screen; el estado base no debe depender de él
  opacity?: number;
  animacion?: string; // clase CSS (carta-sheen | carta-hielo | carta-holo) — solo capas animadas
  duracionSeg?: number; // override de animation-duration (param `velocidad`)
}

export interface EfectoSpec {
  // Capas estáticas, export-safe. Reciben los params para afinarse.
  capas: (p: EfectoParams) => CapaEfecto[];
  // Capas que SOLO se montan si `animar === true` (hero + !reduced-motion).
  capasAnimadas?: (p: EfectoParams) => CapaEfecto[];
  // Si true, el pack reemplaza el foil genérico y suprime el sheen/destellos por
  // nivel (aporta su propia textura; no se duplican capas).
  suprimeNivel: boolean;
}

// `intensidad` (0..1, nominal 0.5) escala las opacidades alrededor de 1×.
//   intensidad 0   → 0.5×   ·   0.5 → 1.0×   ·   1 → 1.5×
function factorIntensidad(p: EfectoParams): number {
  const i = p.intensidad ?? 0.5;
  return 0.5 + Math.min(1, Math.max(0, i));
}

// --- Texturas reutilizadas (mismas técnicas que el foil de PlayerCard) ---

// Grano "foil": ruido fractal SVG inline.
const GRANO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

// Reflejos metálicos fijos (conic) + veta de lujo diagonal.
const REFLEJOS = [
  "conic-gradient(from 215deg at 50% 28%, transparent 0deg, rgba(255,255,255,0.22) 40deg, transparent 85deg, rgba(255,255,255,0.08) 150deg, transparent 210deg, rgba(255,255,255,0.18) 285deg, transparent 340deg)",
  "linear-gradient(115deg, rgba(255,255,255,0.14) 0%, transparent 28%, rgba(255,255,255,0.07) 55%, transparent 78%)",
].join(",");

// Escarcha fina (ruido de alta frecuencia) para el efecto hielo.
const ESCARCHA = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23f)' opacity='0.6'/%3E%3C/svg%3E")`;

// Sesgo de color del metálico según el tinte.
const TINTE_WASH: Record<TintaMetal, string> = {
  acero: "linear-gradient(135deg, rgba(203,213,225,0), rgba(148,163,184,0.28))",
  oro: "linear-gradient(135deg, rgba(255,233,140,0), rgba(200,155,37,0.30))",
  cobre: "linear-gradient(135deg, rgba(217,154,99,0), rgba(138,90,52,0.32))",
  titanio: "linear-gradient(135deg, rgba(229,231,235,0), rgba(107,114,128,0.24))",
};

// Patrones de trama: textura que tilea sobre el degradado base.
const TRAMA_BG: Record<TramaPatron, { background: string; size: string }> = {
  carbono: {
    background:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 4px)",
    size: "8px 8px",
  },
  espiga: {
    background:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px), repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)",
    size: "12px 12px",
  },
  puntos: {
    background: "radial-gradient(circle, rgba(255,255,255,0.16) 1px, transparent 1.6px)",
    size: "12px 12px",
  },
  rombos: {
    background:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 11px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 11px)",
    size: "16px 16px",
  },
  lineas: {
    background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 7px)",
    size: "10px 10px",
  },
  hexagonos: {
    background:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.10'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15z'/%3E%3C/g%3E%3C/svg%3E\")",
    size: "28px 49px",
  },
};

// --- Registro de efectos ---

export const EFECTOS: Record<EfectoCarta, EfectoSpec> = {
  NINGUNO: {
    capas: () => [],
    suprimeNivel: false,
  },

  METALICO: {
    capas: (p) => {
      const k = factorIntensidad(p);
      const tinte = p.tinte ?? "acero";
      return [
        // Reproduce el foil actual (grano + reflejos), tintado por el metal.
        { key: "metal-grano", background: GRANO, backgroundSize: "120px 120px", blendMode: "overlay", opacity: 0.4 * k },
        { key: "metal-reflejos", background: REFLEJOS, blendMode: "screen", opacity: Math.min(1, k) },
        { key: "metal-tinte", background: TINTE_WASH[tinte], blendMode: "soft-light", opacity: 0.6 * k },
      ];
    },
    capasAnimadas: (p) => [
      { key: "metal-sheen", animacion: "carta-sheen", duracionSeg: p.velocidad },
    ],
    suprimeNivel: true,
  },

  HIELO: {
    capas: (p) => {
      const k = factorIntensidad(p);
      return [
        { key: "hielo-escarcha", background: ESCARCHA, backgroundSize: "140px 140px", blendMode: "screen", opacity: 0.18 * k },
        { key: "hielo-glow", background: "radial-gradient(120% 80% at 50% 0%, rgba(224,242,254,0.35), transparent 60%)", blendMode: "screen", opacity: 0.7 * k },
        { key: "hielo-vetas", background: "repeating-linear-gradient(115deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 18px)", blendMode: "screen", opacity: 0.5 * k },
      ];
    },
    capasAnimadas: (p) => [
      { key: "hielo-shimmer", background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)", backgroundSize: "200% 200%", blendMode: "screen", opacity: 0.5, animacion: "carta-hielo", duracionSeg: p.velocidad },
    ],
    suprimeNivel: true,
  },

  TRAMA: {
    capas: (p) => {
      const k = factorIntensidad(p);
      const patron = p.tramaPatron ?? "carbono";
      const t = TRAMA_BG[patron];
      return [
        { key: `trama-${patron}`, background: t.background, backgroundSize: t.size, blendMode: "soft-light", opacity: 0.6 * k },
      ];
    },
    suprimeNivel: true,
  },

  HOLOGRAFICO: {
    capas: (p) => {
      const k = factorIntensidad(p);
      return [
        { key: "holo-base", background: "linear-gradient(115deg, rgba(255,0,128,0.12), rgba(0,255,200,0.12) 30%, rgba(120,80,255,0.12) 55%, rgba(255,200,0,0.12) 80%, rgba(255,0,128,0.12))", blendMode: "color-dodge", opacity: 0.5 * k },
        { key: "holo-grano", background: GRANO, backgroundSize: "120px 120px", blendMode: "overlay", opacity: 0.25 * k },
      ];
    },
    capasAnimadas: (p) => [
      { key: "holo-shift", background: "linear-gradient(115deg, rgba(255,0,128,0.18), rgba(0,255,200,0.18) 25%, rgba(120,80,255,0.18) 50%, rgba(255,200,0,0.18) 75%, rgba(255,0,128,0.18))", backgroundSize: "220% 220%", blendMode: "color-dodge", opacity: 0.55, animacion: "carta-holo", duracionSeg: p.velocidad },
    ],
    suprimeNivel: true,
  },
};

/** ¿El fondo trae un efecto que reemplaza el foil/sheen genérico por nivel? */
export function suprimeNivel(efecto: EfectoCarta | null | undefined): boolean {
  return EFECTOS[efecto ?? "NINGUNO"].suprimeNivel;
}

/**
 * Capas que PlayerCard debe pintar para un efecto. `animar` controla si se
 * incluyen las capas animadas (solo en hero on-screen, fuera de reduced-motion).
 */
export function capasDeEfecto(
  efecto: EfectoCarta | null | undefined,
  params: EfectoParams | null | undefined,
  opts: { animar: boolean },
): CapaEfecto[] {
  const spec = EFECTOS[efecto ?? "NINGUNO"];
  const p = params ?? {};
  const base = spec.capas(p);
  if (opts.animar && spec.capasAnimadas) return [...base, ...spec.capasAnimadas(p)];
  return base;
}
