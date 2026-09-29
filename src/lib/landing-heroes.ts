/**
 * Catálogo curado de portadas para el hero de la landing pública (`/e/[slug]`).
 * Sección 4 de AGENTS.md: NO hay upload de fotos de tenant acá — la escuela
 * elige un id de este catálogo (`landingHeroId`), nunca sube un archivo.
 *
 * Hoy son placeholders: gradientes CSS teñidos con `--brand` (sin imágenes
 * reales todavía). El diseño está pensado para que el día que haya fotos reales
 * del catálogo, cada entrada sume un `imageUrl` sin tocar el esquema — la
 * escuela ya guarda solo el `id`, no una URL.
 *
 * El fondo oscuro usa `--color-overlay` y NO `--color-base`/`--color-surface`:
 * el texto del hero es blanco y tiene que seguir legible en tema claro, y
 * `--color-overlay` es el único token oscuro que el tema claro no redefine.
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
      "bg-[repeating-linear-gradient(45deg,var(--brand)_0px,var(--brand)_2px,var(--color-overlay)_2px,var(--color-overlay)_40px)]",
  },
  {
    id: "vestuario",
    etiqueta: "Vestuario",
    className: "bg-[linear-gradient(180deg,var(--color-overlay)_0%,var(--brand)_160%)]",
  },
];

export const HERO_LANDING_IDS: string[] = HEROES_LANDING.map((h) => h.id);

export const HERO_LANDING_DEFAULT_ID: string = HEROES_LANDING[0].id;

/** Resuelve un hero por id; un id desconocido o null cae al primero del catálogo. */
export function heroLandingPorId(id: string | null | undefined): HeroLandingDef {
  return HEROES_LANDING.find((h) => h.id === id) ?? HEROES_LANDING[0];
}
