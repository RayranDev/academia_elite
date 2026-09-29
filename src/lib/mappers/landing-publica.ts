import { hoyISO } from "@/lib/fecha-calendario";
import { heroLandingPorId, type HeroLandingDef } from "@/lib/landing-heroes";

// Mapper de la landing pública (`/e/[slug]`). Whitelist EXPLÍCITA: nunca deja
// pasar un campo que no esté listado acá a propósito, aunque la fila de origen
// traiga más columnas (jugadores, cartas, fotos, rankings…). Dato de menores:
// esto es lo único que puede llegar a un visitante SIN sesión (Sección 5 AGENTS.md).

export interface CategoriaRow {
  nombre: string;
  anioDesde: number | null;
  anioHasta: number | null;
}

export interface SedeRow {
  nombre: string;
  direccion: string | null;
}

export interface EscuelaPublicaRow {
  nombre: string;
  slug: string;
  logoUrl: string | null;
  colorPrimario: string;
  landingTitular: string | null;
  landingDescripcion: string | null;
  landingHeroId: string | null;
  contactoWhatsapp: string | null;
  contactoEmail: string | null;
  contactoInstagram: string | null;
  categorias: CategoriaRow[];
  sedes: SedeRow[];
}

export interface CategoriaPublicaDTO {
  nombre: string;
  /** Ej. "7-8 años", o null si la categoría no clasifica por edad. */
  rangoEdad: string | null;
}

export interface SedePublicaDTO {
  nombre: string;
  direccion: string | null;
}

export interface LandingPublicaDTO {
  nombre: string;
  slug: string;
  /** El escudo (si lo hay) se sirve por `/api/archivos/escudo-publico/[slug]`; nunca la key cruda de storage. */
  tieneEscudo: boolean;
  colorPrimario: string;
  titular: string | null;
  descripcion: string | null;
  hero: HeroLandingDef;
  /** Link `wa.me` ya armado, o null si la escuela no cargó WhatsApp. */
  whatsappUrl: string | null;
  email: string | null;
  /** Link a `instagram.com/<handle>`, o null si no cargó Instagram. */
  instagramUrl: string | null;
  categorias: CategoriaPublicaDTO[];
  sedes: SedePublicaDTO[];
}

/**
 * Rango de edad ACTUAL a partir de años de nacimiento. `anioDesde` es el año de
 * nacimiento más chico (jugadores más grandes) y `anioHasta` el más grande
 * (jugadores más chicos): la edad se calcula contra `anioRef` (año en curso
 * en la zona de la escuela: `getFullYear()` en el servidor da el año UTC, y la
 * noche del 31 de diciembre mostraría todas las categorías un año más grandes).
 * Devuelve null si la categoría no tiene años cargados (categoría "sin edad").
 */
export function rangoEdadCategoria(
  anioDesde: number | null,
  anioHasta: number | null,
  anioRef: number = Number(hoyISO().slice(0, 4)),
): string | null {
  const edadMax = anioDesde != null ? anioRef - anioDesde : null;
  const edadMin = anioHasta != null ? anioRef - anioHasta : null;

  if (edadMin != null && edadMax != null) {
    return edadMin === edadMax ? `${edadMin} años` : `${edadMin}-${edadMax} años`;
  }
  if (edadMax != null) return `Hasta ${edadMax} años`;
  if (edadMin != null) return `Desde ${edadMin} años`;
  return null;
}

/** Construye el DTO público (whitelist) desde la fila cruda del repositorio. */
export function aLandingPublicaDTO(row: EscuelaPublicaRow): LandingPublicaDTO {
  return {
    nombre: row.nombre,
    slug: row.slug,
    tieneEscudo: !!row.logoUrl,
    colorPrimario: row.colorPrimario,
    titular: row.landingTitular,
    descripcion: row.landingDescripcion,
    hero: heroLandingPorId(row.landingHeroId),
    whatsappUrl: row.contactoWhatsapp ? `https://wa.me/${row.contactoWhatsapp}` : null,
    email: row.contactoEmail,
    instagramUrl: row.contactoInstagram
      ? `https://instagram.com/${row.contactoInstagram}`
      : null,
    categorias: row.categorias.map((c) => ({
      nombre: c.nombre,
      rangoEdad: rangoEdadCategoria(c.anioDesde, c.anioHasta),
    })),
    sedes: row.sedes.map((s) => ({ nombre: s.nombre, direccion: s.direccion })),
  };
}
