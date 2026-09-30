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
 * Qué día del almanaque de la ESCUELA es un instante dado, en `YYYY-MM-DD`.
 *
 * Es el puente en la dirección contraria a `diaDeISO`: toma algo que sí es un
 * momento en el tiempo (cuándo se registró un pago, cuándo se creó un lead) y
 * dice en qué día cae para la escuela. Sin esto, formatear un instante con
 * `date-fns` en el servidor da el día UTC: un pago tomado a las 19:00 en
 * Colombia sale informado al día siguiente.
 *
 * `en-CA` porque su formato corto ES `YYYY-MM-DD`: evita armar el string a
 * mano desde getters, que es justo donde se colaba la zona del proceso.
 */
export function diaEscuelaDe(
  instante: Date,
  zona: string = ZONA_ESCUELA,
): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(instante);
}

/** Hoy en `YYYY-MM-DD` según la zona de la escuela. */
export function hoyISO(ahora: Date = new Date(), zona: string = ZONA_ESCUELA): string {
  return diaEscuelaDe(ahora, zona);
}

/**
 * Desfase de la zona de la escuela respecto de UTC, en milisegundos, PARA UN
 * INSTANTE DADO.
 *
 * Existe para el puñado de cálculos que necesitan un instante y no un día
 * (`inicioDeMes` del perfil del DT). Se deriva de `ZONA_ESCUELA` en vez de
 * hardcodear −5: la constante suelta era una segunda definición de la zona, y
 * coincidía solo porque Colombia no tiene horario de verano. Con el offset
 * calculado sobre el instante, una zona con DST también daría bien.
 */
export function offsetEscuelaMs(
  instante: Date,
  zona: string = ZONA_ESCUELA,
): number {
  const enZona = new Date(instante.toLocaleString("en-US", { timeZone: zona }));
  const enUtc = new Date(instante.toLocaleString("en-US", { timeZone: "UTC" }));
  return enZona.getTime() - enUtc.getTime();
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

/**
 * Instante en que EMPIEZA un día del almanaque de la escuela (su medianoche
 * local), dado como `YYYY-MM-DD`.
 *
 * Existe porque "los eventos de hoy" son un rango de INSTANTES: el día de
 * Bogotá va de las 05:00 UTC de hoy a las 05:00 UTC de mañana. Armarlo con
 * `setHours(0, 0, 0, 0)` usa la zona del proceso: en Vercel (UTC) un
 * entrenamiento a las 19:30 hora Colombia (00:30 UTC) caía en "mañana" y
 * desaparecía del home del DT.
 *
 * El desfase se calcula dos veces: la primera con la medianoche UTC como
 * aproximación, la segunda sobre el instante ya corregido, para que un cambio
 * de horario de verano entre ambos no lo corra una hora.
 */
export function inicioDeDiaEscuela(
  diaISO: string,
  zona: string = ZONA_ESCUELA,
): Date {
  const medianocheUtc = new Date(`${diaISO}T00:00:00.000Z`).getTime();
  const aproximado = medianocheUtc - offsetEscuelaMs(new Date(medianocheUtc), zona);
  return new Date(medianocheUtc - offsetEscuelaMs(new Date(aproximado), zona));
}

/** El día siguiente de un `YYYY-MM-DD`, sin pasar por la zona del proceso. */
export function diaSiguienteISO(diaISO: string): string {
  const d = new Date(`${diaISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Rango de instantes [desde, hasta] del día de la escuela que contiene `ahora`.
 * `hasta` es el último milisegundo del día (inclusivo, como el resto de las
 * consultas por rango del proyecto).
 */
export function rangoDelDiaEscuela(
  ahora: Date = new Date(),
  zona: string = ZONA_ESCUELA,
): { desde: Date; hasta: Date } {
  const dia = hoyISO(ahora, zona);
  const desde = inicioDeDiaEscuela(dia, zona);
  const manana = inicioDeDiaEscuela(diaSiguienteISO(dia), zona);
  return { desde, hasta: new Date(manana.getTime() - 1) };
}
