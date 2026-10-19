/**
 * Cabeceras CORS de la foto de un menor. La exportación de la carta a PNG
 * (HubHero: `<img crossOrigin="anonymous">` + canvas) puede enviar `Origin`
 * incluso hacia el mismo sitio (túneles como ngrok, algunos navegadores). Se
 * refleja SOLO si ese origen es el propio dominio de la app; para cualquier
 * otro origen no se emite `Access-Control-Allow-Origin`, de modo que ningún
 * sitio de terceros puede leer la imagen desde el navegador.
 */
export function cabecerasCorsFoto(headers: {
  get(name: string): string | null;
}): Record<string, string> {
  const base = { Vary: "Origin" };
  const origin = headers.get("origin");
  if (!origin) return base;

  const hostPropio = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!hostPropio) return base;

  let hostDelOrigen: string;
  try {
    hostDelOrigen = new URL(origin).host;
  } catch {
    return base;
  }
  if (hostDelOrigen.toLowerCase() !== hostPropio.split(",")[0].trim().toLowerCase()) {
    return base;
  }
  return { ...base, "Access-Control-Allow-Origin": origin };
}
