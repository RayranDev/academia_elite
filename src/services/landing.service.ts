import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  obtenerEscuelaPublicaPorSlug,
  actualizarLandingEscuela as actualizarLandingEscuelaRepo,
  obtenerEscuela,
} from "@/repositories/escuela.repository";
import { leerFoto } from "@/lib/foto/storage";
import { aLandingPublicaDTO, type LandingPublicaDTO } from "@/lib/mappers/landing-publica";
import type { LandingInput } from "@/lib/validators/landing";

/**
 * Estado público de la landing de una escuela (`/e/[slug]`), sin sesión:
 * - no-encontrada: el slug no existe, o la escuela no está `activa` (mismo 404
 *   en ambos casos: no confirmamos cuál de los dos pasó).
 * - en-construccion: la escuela existe y está activa, pero no publicó su
 *   landing todavía. Solo nombre/marca (nada de contacto ni programas).
 * - publicada: DTO completo (whitelist) para el template.
 */
export type LandingPublicaResultado =
  | { estado: "no-encontrada" }
  | {
      estado: "en-construccion";
      nombre: string;
      tieneEscudo: boolean;
      colorPrimario: string;
    }
  | { estado: "publicada"; data: LandingPublicaDTO };

/** Resuelve la landing pública por slug. Sin auth: la llama la ruta `/e/[slug]`. */
export async function obtenerLandingPublica(slug: string): Promise<LandingPublicaResultado> {
  const row = await obtenerEscuelaPublicaPorSlug(slug);
  if (!row || !row.activa) return { estado: "no-encontrada" };

  if (!row.landingPublicada) {
    return {
      estado: "en-construccion",
      nombre: row.nombre,
      tieneEscudo: !!row.logoUrl,
      colorPrimario: row.colorPrimario,
    };
  }

  return { estado: "publicada", data: aLandingPublicaDTO(row) };
}

/**
 * Escudo de la escuela para su landing pública, sin sesión. Misma regla de
 * visibilidad que `obtenerLandingPublica` (existe y está `activa`), pero sin
 * exigir `landingPublicada`: el estado "en construcción" también muestra el
 * escudo. Devuelve null si no corresponde servirlo.
 */
export async function obtenerEscudoPublico(slug: string): Promise<Buffer | null> {
  const row = await obtenerEscuelaPublicaPorSlug(slug);
  if (!row || !row.activa || !row.logoUrl) return null;
  return leerFoto(row.logoUrl);
}

export interface LandingAdminDTO {
  slug: string;
  publicada: boolean;
  titular: string | null;
  descripcion: string | null;
  heroId: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
}

/** Configuración actual de la landing (incluye el borrador sin publicar) para el panel. */
export async function obtenerLandingAdmin(ctx: AuthContext): Promise<LandingAdminDTO> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const e = await obtenerEscuela(escuelaId);
  if (!e) throw new NotFoundError("Escuela no encontrada.");
  return {
    slug: e.slug,
    publicada: e.landingPublicada,
    titular: e.landingTitular,
    descripcion: e.landingDescripcion,
    heroId: e.landingHeroId,
    whatsapp: e.contactoWhatsapp,
    email: e.contactoEmail,
    instagram: e.contactoInstagram,
  };
}

/**
 * Actualiza la landing pública de la PROPIA escuela. Mismo patrón que
 * `actualizarBranding` (escuela.service.ts): solo ESCUELA_ADMIN de su tenant,
 * sin ruta de soporte del SUPER_ADMIN (no la tiene tampoco branding).
 */
/** Devuelve el slug actualizado: lo necesita la action para revalidar `/e/[slug]` sin otra consulta. */
export async function actualizarLandingEscuela(
  ctx: AuthContext,
  data: LandingInput,
): Promise<{ slug: string }> {
  requireRole(ctx, ["ESCUELA_ADMIN"]);
  const escuelaId = requireEscuela(ctx);
  const escuela = await actualizarLandingEscuelaRepo(escuelaId, {
    landingPublicada: data.publicada,
    landingTitular: data.titular,
    landingDescripcion: data.descripcion,
    landingHeroId: data.heroId,
    contactoWhatsapp: data.whatsapp,
    contactoEmail: data.email,
    contactoInstagram: data.instagram,
  });
  return { slug: escuela.slug };
}
