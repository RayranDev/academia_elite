import type { MetadataRoute } from "next";
import { urlPublicaBase } from "@/lib/url-publica";

/**
 * robots.txt. NO es una defensa: solo lo respetan los buscadores y los bots que
 * se portan bien. Sirve para no gastar pedidos (cada uno ejecuta una función)
 * en áreas que exigen sesión y para ordenar qué se indexa.
 *
 * Las áreas con sesión (`PREFIJO_ROL` de `src/proxy.ts`) y las pantallas de
 * acceso quedan fuera. `/e/` NO se bloquea a propósito: si se prohíbe rastrearla,
 * el buscador nunca ve el `noindex` de las landings "en construcción" (ese
 * control vive en la metadata de cada página) y podría indexar la URL igual.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/e/"],
      disallow: [
        "/api/",
        "/admin",
        "/escuela",
        "/dt",
        "/jugador",
        "/login",
        "/registro",
        "/recuperar",
        "/bloqueado",
        "/aceptar-politica",
      ],
    },
    sitemap: `${urlPublicaBase()}/sitemap.xml`,
  };
}
