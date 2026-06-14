import { z } from "zod";

export const ESTADOS_MEMBRESIA = ["PENDIENTE", "PAGADA", "VENCIDA"] as const;

export const membresiaSchema = z.object({
  jugadorId: z.string().min(1, { error: "Elige un jugador." }),
  // Período mensual en formato AAAA-MM (ej: 2026-06).
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, { error: "El período debe ser AAAA-MM." }),
  monto: z
    .union([z.literal(""), z.coerce.number().min(0).max(99999999)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  estado: z.enum(ESTADOS_MEMBRESIA),
});

export type MembresiaInput = z.infer<typeof membresiaSchema>;

export const cambiarEstadoMembresiaSchema = z.object({
  membresiaId: z.string().min(1),
  estado: z.enum(ESTADOS_MEMBRESIA),
});
