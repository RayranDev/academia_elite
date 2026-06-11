import { z } from "zod";
import { POSICIONES } from "@/types";
import { passwordSchema } from "@/lib/validators/auth";

/**
 * Auto-registro del padre con código de invitación. Crea su cuenta (rol JUGADOR,
 * gestionada por el padre) y el jugador en estado PENDIENTE hasta que el DT apruebe.
 */
export const registroSchema = z.object({
  codigo: z.string().trim().toUpperCase().min(4).max(12),
  // Cuenta del padre/tutor
  padreNombre: z.string().trim().min(2, { error: "Tu nombre es requerido." }).max(120),
  padreEmail: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  password: passwordSchema,
  // Datos del hijo/a
  jugadorNombre: z.string().trim().min(2, { error: "Nombre del jugador requerido." }).max(60),
  jugadorApellido: z.string().trim().min(2, { error: "Apellido requerido." }).max(60),
  fechaNacimiento: z.coerce.date({ error: "Fecha de nacimiento inválida." }),
  posicion: z.enum(POSICIONES),
});

export type RegistroInput = z.infer<typeof registroSchema>;
