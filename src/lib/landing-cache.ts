import { revalidatePath } from "next/cache";

/**
 * Invalida la caché de TODAS las landings públicas (`/e/[slug]`).
 *
 * La landing se regenera cada 60 s como máximo (ver `revalidate` en la página).
 * Esto lo adelanta al instante cuando una acción cambia algo que la landing
 * muestra o su visibilidad: nombre, escudo, categorías, sedes, texto de la
 * landing o activar/desactivar la escuela. Sin esto, desactivar una escuela
 * seguiría mostrando su vitrina hasta un minuto.
 *
 * Se invalida el patrón entero (y no el slug) a propósito: es barato y evita que
 * una acción tenga que conocer el slug del tenant que modifica.
 */
export function invalidarLandingsPublicas(): void {
  revalidatePath("/e/[slug]", "page");
  // Una landing que se publica o se desactiva entra o sale del sitemap.
  revalidatePath("/sitemap.xml");
}
