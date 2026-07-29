import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";

// Validación de entrada del modo soporte (ROL-SUPER-ADMIN.md M2).

export const iniciarSoporteSchema = z.object({
  escuelaId: z.string().min(1, "Falta la escuela."),
  motivo: textoSeguro({ min: 1, max: 500, error: "El soporte requiere un motivo." }),
  soloLectura: z.boolean(),
});
export type IniciarSoporteInput = z.infer<typeof iniciarSoporteSchema>;

export const habilitarEscrituraSchema = z.object({
  motivo: textoSeguro({ min: 1, max: 500, error: "El soporte requiere un motivo." }),
});
export type HabilitarEscrituraInput = z.infer<typeof habilitarEscrituraSchema>;
