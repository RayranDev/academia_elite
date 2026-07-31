import { z } from "zod";
import { CONCEPTOS_MEMBRESIA } from "@/lib/validators/membresia";

export const arancelSchema = z.object({
  // "" = precio general de la escuela (el <select> manda cadena vacía).
  categoriaId: z
    .string()
    .optional()
    .transform((v) => (v == null || v === "" ? null : v)),
  concepto: z.enum(CONCEPTOS_MEMBRESIA),
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
  // Desde cuándo rige. Vacío = hoy. Se permite futuro: la escuela puede dejar
  // programado el aumento antes de que entre en vigencia.
  //
  // Nota: un `<input type="date">` manda "AAAA-MM-DD" y `z.coerce.date()` lo lee
  // como medianoche UTC, así que en Colombia (UTC-5) un precio fechado el 1 de
  // agosto rige desde las 19:00 del 31 de julio. Irrelevante para mensualidades
  // (la resolución es por mes); tenerlo en cuenta si algún día se cobra por día.
  vigenteDesde: z
    .union([z.literal(""), z.coerce.date()])
    .optional()
    .transform((v) => (v === "" || v == null ? new Date() : v)),
});

export type ArancelInput = z.infer<typeof arancelSchema>;
