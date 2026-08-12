/**
 * Fechas de CALENDARIO, distintas de los instantes.
 *
 * Un cumpleaños, el vencimiento de un apto médico o el límite de un objetivo no
 * son un momento en el tiempo: son un día del almanaque. Pero entran por un
 * `<input type="date">` ("2026-08-12"), `z.coerce.date()` los parsea como
 * MEDIANOCHE UTC y quedan guardados como un instante. Tratarlos después como
 * instante rompe de dos formas en una zona negativa como la de Colombia (UTC-5):
 *
 * 1. Al MOSTRARLOS con la zona del navegador, `2026-08-12T00:00:00Z` se lee
 *    "11 ago" — un día menos del que se cargó. La ficha mostraba una fecha y el
 *    formulario de edición otra.
 * 2. Al COMPARARLOS contra `new Date()`, el apto se marcaba vencido desde la
 *    tarde del día anterior y durante todo el día en que todavía era válido.
 */

/**
 * Zona de referencia para decidir qué día es "hoy".
 *
 * Tiene que ser EXPLÍCITA y no la del proceso: el SSR corre en UTC (Vercel),
 * así que `new Date().getDate()` daría el día UTC y un apto que vence hoy
 * aparecería vencido desde las 19:00 hora de Colombia. Hoy la plataforma opera
 * en un solo país (ver `indicativos.ts`, Ley 1581), por eso es una constante;
 * el día que haya escuelas en otro huso, esto pasa a ser un campo de `Escuela`
 * y estas funciones reciben la zona por parámetro — la firma ya lo contempla.
 */
export const ZONA_ESCUELA = "America/Bogota";

/**
 * Parte `YYYY-MM-DD` de un ISO, que es el día tal como se cargó.
 *
 * ASUME un ISO normalizado a UTC (`Date.toISOString()`), que es lo que
 * producen todos los DTOs del proyecto. Con un offset explícito
 * (`2026-08-12T00:00:00-05:00`) el recorte daría el día equivocado en
 * silencio — cuidado si algún día entra una fecha desde otra fuente.
 */
export function diaDeISO(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Hoy en `YYYY-MM-DD` según la zona de la escuela.
 *
 * `en-CA` porque su formato corto ES `YYYY-MM-DD`: evita armar el string a
 * mano desde getters, que es justo donde se colaba la zona del proceso.
 */
export function hoyISO(ahora: Date = new Date(), zona: string = ZONA_ESCUELA): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(ahora);
}

/**
 * Corte para las consultas que comparan una fecha de calendario guardada
 * (`{ lt: … }`): medianoche UTC del día que hoy es en la escuela.
 *
 * Se deriva de `hoyISO` a propósito, no de `getUTCDate()`: así el conteo
 * agregado y el badge de la ficha no pueden responder distinto, que es
 * exactamente lo que pasaba cuando cada uno resolvía "hoy" por su cuenta.
 */
export function inicioDelDiaEscuela(
  ahora: Date = new Date(),
  zona: string = ZONA_ESCUELA,
): Date {
  return new Date(`${hoyISO(ahora, zona)}T00:00:00.000Z`);
}

/**
 * ¿El apto médico está vencido? Solo si su día es ANTERIOR a hoy: el día del
 * vencimiento el apto todavía vale. `null` = sin cargar, que no es lo mismo
 * que vencido.
 *
 * Compara texto `YYYY-MM-DD`, que ordena igual como texto que como fecha.
 */
export function aptoVencido(
  aptoMedicoVenceISO: string | null | undefined,
  ahora: Date = new Date(),
  zona: string = ZONA_ESCUELA,
): boolean {
  if (!aptoMedicoVenceISO) return false;
  return diaDeISO(aptoMedicoVenceISO) < hoyISO(ahora, zona);
}
