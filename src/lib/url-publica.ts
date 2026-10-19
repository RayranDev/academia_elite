/**
 * URL base pública del sitio, sin barra final (para sitemap y robots).
 * Orden: `AUTH_URL` / `NEXTAUTH_URL` (ya obligatorias en producción para el login),
 * luego el dominio de producción que Vercel inyecta, y por último localhost.
 */
export function urlPublicaBase(): string {
  const configurada = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configurada) return configurada.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`.replace(/\/+$/, "");
  return "http://localhost:3000";
}
