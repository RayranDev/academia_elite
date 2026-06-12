import { z } from "zod";

/** Validación de la semana de progreso personal que envía el responsable. */
export const progresoSemanaSchema = z.object({
  jugadorId: z.string().min(1),
  academico: z.boolean(),
  comportamiento: z.boolean(),
  puntualidad: z.boolean(),
  ayudaCasa: z.boolean(),
  valores: z.boolean(),
  nota: z
    .string()
    .trim()
    .max(300, "La nota no puede superar 300 caracteres.")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ProgresoSemanaInput = z.infer<typeof progresoSemanaSchema>;
