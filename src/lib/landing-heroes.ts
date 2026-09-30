/**
 * Catálogo curado de portadas para el hero de la landing pública (`/e/[slug]`).
 * Sección 4 de AGENTS.md: NO hay upload de fotos de tenant acá — la escuela
 * elige un id de este catálogo (`landingHeroId`), nunca sube un archivo.
 *
 * Cada entrada es un degradado teñido con `--brand` más una ilustración
 * vectorial propia (`src/components/landing/HeroIlustracion.tsx`), sin personas
 * ni caras. Si algún día hay fotos curadas por la plataforma, una entrada puede
 * sumar un `imageUrl` sin tocar el esquema: la escuela solo guarda el `id`.
 */
export interface HeroLandingDef {
  id: string;
  etiqueta: string;
  /** Clases utilitarias de Tailwind que pintan el fondo del hero. */
  className: string;
}

export const HEROES_LANDING: readonly HeroLandingDef[] = [
  {
    id: "cancha-verde",
    etiqueta: "Cancha verde",
    className: "bg-[linear-gradient(160deg,var(--brand)_0%,var(--color-overlay)_75%)]",
  },
  {
    id: "atardecer",
    etiqueta: "Atardecer de cancha",
    className:
      "bg-[linear-gradient(135deg,var(--brand)_0%,color-mix(in_srgb,var(--brand)_25%,var(--color-overlay))_55%,var(--color-overlay)_100%)]",
  },
  {
    id: "estadio-noche",
    etiqueta: "Noche de estadio",
    className: "bg-[radial-gradient(circle_at_30%_20%,var(--brand)_0%,var(--color-overlay)_65%)]",
  },
  {
    id: "lineas-cancha",
    etiqueta: "Líneas de cancha",
    className:
      "bg-[linear-gradient(200deg,color-mix(in_srgb,var(--brand)_70%,var(--color-overlay))_0%,var(--color-overlay)_80%)]",
  },
  {
    id: "vestuario",
    etiqueta: "Vestuario",
    className: "bg-[linear-gradient(180deg,var(--color-overlay)_0%,var(--brand)_160%)]",
  },
  {
    id: "porteria",
    etiqueta: "Portería",
    className: "bg-[linear-gradient(170deg,var(--color-overlay)_0%,color-mix(in_srgb,var(--brand)_55%,var(--color-overlay))_100%)]",
  },
  {
    id: "balon",
    etiqueta: "El balón",
    className: "bg-[linear-gradient(120deg,var(--color-overlay)_15%,color-mix(in_srgb,var(--brand)_65%,var(--color-overlay))_100%)]",
  },
];

export const HERO_LANDING_IDS: string[] = HEROES_LANDING.map((h) => h.id);

export const HERO_LANDING_DEFAULT_ID: string = HEROES_LANDING[0].id;

/** Resuelve un hero por id; un id desconocido o null cae al primero del catálogo. */
export function heroLandingPorId(id: string | null | undefined): HeroLandingDef {
  return HEROES_LANDING.find((h) => h.id === id) ?? HEROES_LANDING[0];
}
