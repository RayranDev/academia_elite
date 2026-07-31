import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";

export const ESTADOS_MEMBRESIA = ["PENDIENTE", "PAGADA", "VENCIDA"] as const;

/** Qué se está cobrando. Una escuela no vive solo de la mensualidad. */
export const CONCEPTOS_MEMBRESIA = [
  "MENSUALIDAD",
  "MATRICULA",
  "INDUMENTARIA",
  "TORNEO",
  "TRANSPORTE",
  "OTRO",
] as const;

/** Medios de pago habituales en Colombia. */
export const MEDIOS_PAGO = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "NEQUI",
  "DAVIPLATA",
  "OTRO",
] as const;

export const ETIQUETA_CONCEPTO: Record<string, string> = {
  MENSUALIDAD: "Mensualidad",
  MATRICULA: "Matrícula",
  INDUMENTARIA: "Indumentaria",
  TORNEO: "Torneo",
  TRANSPORTE: "Transporte",
  OTRO: "Otro",
};

/** Monto opcional venido de un `<input type="number">` (llega "" si está vacío). */
const montoOpcional = z
  .union([z.literal(""), z.coerce.number().min(0).max(99999999)])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

export const membresiaSchema = z.object({
  jugadorId: z.string().min(1, { error: "Elige un jugador." }),
  // Período mensual en formato AAAA-MM (ej: 2026-06).
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, { error: "El período debe ser AAAA-MM." }),
  concepto: z.enum(CONCEPTOS_MEMBRESIA).default("MENSUALIDAD"),
  monto: montoOpcional,
  descuento: montoOpcional,
  estado: z.enum(ESTADOS_MEMBRESIA),
});

export type MembresiaInput = z.infer<typeof membresiaSchema>;

/**
 * Cambio de estado. Cuando pasa a PAGADA se puede registrar cómo se pagó: el
 * medio es una unión cerrada y la referencia es texto libre del usuario, así que
 * pasa por `textoSeguro` (AGENTS.md §5).
 */
export const cambiarEstadoMembresiaSchema = z.object({
  membresiaId: z.string().min(1),
  estado: z.enum(ESTADOS_MEMBRESIA),
  medioPago: z
    .union([z.literal(""), z.enum(MEDIOS_PAGO)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  referenciaPago: z
    .union([z.literal(""), textoSeguro({ max: 60 })])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export type CambiarEstadoMembresiaInput = z.infer<
  typeof cambiarEstadoMembresiaSchema
>;

/** Generación masiva de la cobranza de un período. */
export const generarCuotasSchema = z.object({
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, { error: "El período debe ser AAAA-MM." }),
  concepto: z.enum(CONCEPTOS_MEMBRESIA).default("MENSUALIDAD"),
});
