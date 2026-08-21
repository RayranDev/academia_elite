import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { hoyISO } from "@/lib/fecha-calendario";

export const arancelSchema = z.object({
  // "" = precio general de la escuela (el <select> manda cadena vacía).
  categoriaId: z
    .string()
    .optional()
    .transform((v) => (v == null || v === "" ? null : v)),
  // Id del catálogo de la escuela, no un enum: cada escuela arma sus conceptos.
  // Que el id sea del tenant lo verifica el servicio (`resolverConceptoDelTenant`),
  // no Zod: eso requiere ir a la base y el validador es puro.
  conceptoId: z.string().min(1, { error: "Elige un concepto." }),
  // El monto es OBLIGATORIO y se exige antes de coercionar. `z.coerce.number()`
  // a secas convierte `null` y `""` en 0 (`Number(null) === 0`), así que un POST
  // sin el campo — una Server Action es un endpoint HTTP, el `required` del
  // input es solo cortesía del navegador — crearía un precio de $0 que después
  // emite el mes entero en cero. Y una vez escrito, un 0 "vacío" es
  // indistinguible de un 0 deliberado: no hay forma de recuperarlo después.
  monto: z
    .union([z.string().min(1, { error: "Escribe un monto." }), z.number()])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n), { error: "El monto debe ser un número." })
    .refine((n) => n >= 0, { error: "El monto no puede ser negativo." })
    .refine((n) => n <= 99999999, { error: "El monto es demasiado alto." }),
  // Texto libre opcional, sobre todo para el concepto OTRO (AGENTS.md §5:
  // texto libre sanitizado con textoSeguro, no z.string() pelado).
  descripcion: z
    .union([z.literal(""), textoSeguro({ max: 200 })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  // Desde cuándo rige. Vacío = hoy. Se permite futuro: la escuela puede dejar
  // programado el aumento antes de que entre en vigencia.
  //
  // Nota: un `<input type="date">` manda "AAAA-MM-DD" y `z.coerce.date()` lo lee
  // como medianoche UTC, así que en Colombia (UTC-5) un precio fechado el 1 de
  // agosto rige desde las 19:00 del 31 de julio. Irrelevante para mensualidades
  // (la resolución es por mes); tenerlo en cuenta si algún día se cobra por día.
  //
  // El default de "vacío" es la MEDIANOCHE UTC de hoy, no `new Date()`. Con el
  // instante, un precio creado a las 20:00 en Colombia quedaba guardado como el
  // día siguiente en UTC, y todo lo que lee este campo lo trata como día de
  // almanaque (`diaDeISO` en el modal, `<FechaCalendario/>` en la tabla): la
  // escuela guardaba "rige desde hoy" y la pantalla le mostraba mañana.
  vigenteDesde: z
    .union([z.literal(""), z.coerce.date()])
    .optional()
    .transform((v) =>
      v === "" || v == null ? new Date(`${hoyISO()}T00:00:00.000Z`) : v,
    ),
});

export type ArancelInput = z.infer<typeof arancelSchema>;

/** Edición de un precio ya existente: mismas reglas + el id del arancel. */
export const editarArancelSchema = arancelSchema.extend({
  id: z.string().min(1, { error: "Falta el precio a editar." }),
});

export type EditarArancelInput = z.infer<typeof editarArancelSchema>;

/**
 * Mapea el `FormData` del formulario de precios al schema.
 *
 * Vive ACÁ y no en la action a propósito. Cuando el mapeo estaba allá, renombrar
 * un campo del schema dejaba la action leyendo la clave vieja: `safeParse` toma
 * `unknown`, así que la clave sobrante se descarta en silencio y la que falta
 * llega `undefined`. El alta de precios quedó rota y typecheck, lint y los 384
 * tests pasaron igual. Con el mapeo pegado al schema, renombrar obliga a tocar
 * las dos mitades en el mismo archivo, y el test de abajo lo cubre.
 *
 * Los nombres de acá tienen que coincidir con los `name=` de `ArancelesPanel`,
 * `EditarArancelModal` y `ConceptoSelect`.
 */
export function arancelDesdeFormData(fd: FormData) {
  return {
    categoriaId: fd.get("categoriaId") ?? "",
    // `?? ""` y no el `null` crudo: un campo ausente en un FormData llega
    // `null`, y contra `z.string()` eso da "Invalid input: expected string,
    // received null" — un mensaje de Zod, en inglés, dentro de una UI en
    // español. Con cadena vacía dispara el `.min(1)`, que sí tiene el texto
    // del dominio.
    conceptoId: fd.get("conceptoId") ?? "",
    monto: fd.get("monto"),
    descripcion: fd.get("descripcion") ?? "",
    vigenteDesde: fd.get("vigenteDesde") ?? "",
  };
}

/** Igual que `arancelDesdeFormData` más el id del precio que se edita. */
export function editarArancelDesdeFormData(fd: FormData) {
  return { ...arancelDesdeFormData(fd), id: fd.get("id") };
}
