import { z } from "zod";

// Validación de entrada del modo soporte (ROL-SUPER-ADMIN.md M2).

export const iniciarSoporteSchema = z.object({
  escuelaId: z.string().min(1, "Falta la escuela."),
  motivo: z.string().trim().min(1, "El soporte requiere un motivo."),
  soloLectura: z.boolean(),
});
export type IniciarSoporteInput = z.infer<typeof iniciarSoporteSchema>;

export const habilitarEscrituraSchema = z.object({
  motivo: z.string().trim().min(1, "El soporte requiere un motivo."),
});
export type HabilitarEscrituraInput = z.infer<typeof habilitarEscrituraSchema>;
