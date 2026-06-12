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

/** Validación masiva del DT: una entrada por jugador (máx. 100). */
export const progresoDtSchema = z.object({
  entradas: z
    .array(progresoSemanaSchema)
    .min(1, "No hay jugadores marcados.")
    .max(100, "Demasiados jugadores en una sola validación."),
});

export type ProgresoDtInput = z.infer<typeof progresoDtSchema>;
