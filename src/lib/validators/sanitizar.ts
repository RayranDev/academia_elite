import { z } from "zod";

/**
 * Defensa en profundidad contra inyección de HTML/scripts en campos de texto.
 * React ya escapa el contenido al renderizar, pero además rechazamos en la
 * frontera (Zod) cualquier cosa con pinta de etiqueta HTML, `javascript:` o
 * manejadores de eventos. Se usa con `.superRefine`/`.refine` sobre strings.
 */
const PATRONES_PELIGROSOS: RegExp[] = [
  /<\s*\/?\s*[a-z][^>]*>/i, // <script>, <img ...>, </b>, etc.
  /<\s*\/?\s*(script|iframe|style|svg|object|embed|link|meta)\b/i,
  /javascript:/i,
  /data:text\/html/i,
  /\son\w+\s*=/i, // onerror=, onclick=, ...
];

/** ¿La cadena contiene HTML/scripts? */
export function tieneContenidoPeligroso(valor: string): boolean {
  return PATRONES_PELIGROSOS.some((re) => re.test(valor));
}

/**
 * Texto seguro: recorta, limita longitud y rechaza HTML/scripts. Base para los
 * campos de texto libre (nombres, mensajes, ciudades…).
 */
export function textoSeguro(opts: { min?: number; max: number; error?: string }) {
  let s = z.string().trim().max(opts.max);
  if (opts.min) s = s.min(opts.min, opts.error ? { error: opts.error } : undefined);
  return s.refine((v) => !tieneContenidoPeligroso(v), {
    error: "No se permite contenido HTML ni scripts.",
  });
}
