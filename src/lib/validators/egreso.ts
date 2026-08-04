import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { MEDIOS_PAGO } from "@/lib/validators/membresia";

/** Qué se paga con un egreso. Gasto operativo típico de una escuela de fútbol. */
export const CONCEPTOS_EGRESO = [
  "CANCHA",
  "ARBITRO",
  "INDUMENTARIA",
  "TRANSPORTE",
  "MANTENIMIENTO",
  "SUELDOS",
  "OTRO",
] as const;

// Tipado contra la unión y no como `Record<string, string>`: al agregar un
// concepto, TypeScript avisa que falta su etiqueta en vez de dejar que cada
// punto de uso lo tape con un `?? valor`.
export const ETIQUETA_CONCEPTO_EGRESO: Record<
  (typeof CONCEPTOS_EGRESO)[number],
  string
> = {
  CANCHA: "Cancha",
  ARBITRO: "Árbitro",
  INDUMENTARIA: "Indumentaria",
  TRANSPORTE: "Transporte",
  MANTENIMIENTO: "Mantenimiento",
  SUELDOS: "Sueldos",
  OTRO: "Otro",
};

// El DTO trae el concepto como `string` (puede venir de datos viejos), así que
// la búsqueda cae al crudo si no hay etiqueta.
const etiquetar = (mapa: Record<string, string>, valor: string) => mapa[valor] ?? valor;

export const etiquetaConceptoEgreso = (v: string) => etiquetar(ETIQUETA_CONCEPTO_EGRESO, v);

export const egresoSchema = z.object({
  concepto: z.enum(CONCEPTOS_EGRESO),
  // Monto obligatorio: a diferencia de Membresia, acá no hay "cuota sin monto
  // resuelto" — un egreso siempre registra cuánto se gastó.
  monto: z.coerce
    .number()
    .positive({ error: "El monto tiene que ser mayor a 0." })
    .max(99999999, { error: "El monto es demasiado grande." }),
  fecha: z.coerce.date(),
  descripcion: z
    .union([z.literal(""), textoSeguro({ max: 200 })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  medioPago: z
    .union([z.literal(""), z.enum(MEDIOS_PAGO)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  referenciaPago: z
    .union([z.literal(""), textoSeguro({ max: 60 })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export type EgresoInput = z.infer<typeof egresoSchema>;
