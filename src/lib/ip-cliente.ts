/**
 * Headers mínimos que necesitamos: alcanza con `get`. Tanto `Request.headers`
 * (route handlers) como el `ReadonlyHeaders` que devuelve `await headers()` de
 * `next/headers` (server actions) cumplen esta forma, sin acoplarnos al tipo
 * concreto de ninguna de las dos APIs.
 */
type HeadersLegibles = { get(name: string): string | null };

/**
 * Resuelve la IP del cliente para usarla como clave de `rateLimit`.
 *
 * Tomamos el primer valor de `x-forwarded-for` y caemos a `x-real-ip` si
 * falta. Esto es seguro específicamente porque desplegamos en Vercel: el edge
 * de Vercel es quien procesa la conexión TCP del cliente y arma este header
 * él mismo (no reenvía sin tocar lo que el cliente le mandó), así que esa
 * primera posición no es falseable por el cliente. Si este código corriera
 * detrás de otra cadena de proxies que solo *agreguen* al `x-forwarded-for`
 * existente en vez de sanearlo, la primera posición SÍ sería falseable (un
 * cliente puede mandar su propio `X-Forwarded-For` de entrada) y habría que
 * leer desde la derecha, saltando tantas posiciones como proxies de confianza
 * haya. Ver la nota de Vercel sobre `x-forwarded-for` en Functions.
 *
 * `x-real-ip` es el fallback para no reventar en local/otros hosts; en Vercel
 * la plataforma completa ambos headers, así que ese fallback casi nunca se
 * ejercita en producción.
 *
 * Importante: si dos requests sin ninguno de los dos headers cayeran ambas en
 * `"desconocida"`, compartirían el mismo balde de rate limit y una se
 * banearía por culpa de la otra. Por eso esta función centraliza la lógica en
 * un solo lugar en vez de duplicar `?.split(",")[0]?.trim() ?? "desconocida"`
 * en cada action/route.
 */
export function ipCliente(headers: HeadersLegibles): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const primera = xff.split(",")[0]?.trim();
    if (primera) return primera;
  }

  const xRealIp = headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;

  return "desconocida";
}
