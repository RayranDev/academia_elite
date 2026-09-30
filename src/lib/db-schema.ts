/**
 * Opciones de `PrismaPg` derivadas del parámetro `?schema=` de la URL.
 *
 * `@prisma/adapter-pg` IGNORA `?schema=` en la cadena de conexión: el schema
 * solo se respeta si se pasa como opción (`new PrismaPg(cfg, { schema })`). La
 * CLI de Prisma (migrate) sí lo lee, así que las tablas se creaban en el schema
 * `e2e` pero el seed y la app escribían en `public`: cada corrida de los E2E
 * borraba y resembraba los datos reales, mientras el schema `e2e` quedaba vacío.
 * Con esto la app y el seed hablan con el schema que dice la URL.
 *
 * Sin `?schema=` (producción, desarrollo normal) o con `public` devuelve `{}`:
 * comportamiento idéntico al de antes.
 */
export function opcionesPgDesdeUrl(connectionString: string): { schema?: string } {
  try {
    const schema = new URL(connectionString).searchParams.get("schema");
    return schema && schema !== "public" ? { schema } : {};
  } catch {
    return {};
  }
}
