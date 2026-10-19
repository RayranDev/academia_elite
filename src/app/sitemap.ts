import type { MetadataRoute } from "next";
import { listarSlugsParaSitemap } from "@/services/landing.service";
import { urlPublicaBase } from "@/lib/url-publica";

// Se regenera cada hora; `invalidarLandingsPublicas()` lo adelanta cuando una
// escuela publica o desactiva su landing.
export const revalidate = 3600;

/**
 * Sitemap: la portada, la política legal y las landings que se pueden indexar
 * (escuelas activas con landing publicada). Las "en construcción" quedan fuera a
 * propósito: llevan `noindex` y no deben anunciarse a los buscadores.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlPublicaBase();
  const slugs = await listarSlugsParaSitemap();
  return [
    { url: `${base}/` },
    { url: `${base}/legal` },
    ...slugs.map((slug) => ({ url: `${base}/e/${slug}` })),
  ];
}
