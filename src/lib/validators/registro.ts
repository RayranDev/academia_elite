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

/**
 * Vinculación del padre con un hijo YA creado: el padre crea su cuenta e indica
 * el código de la escuela (slug) y el código del jugador. La BD vincula su
 * cuenta al perfil del hijo para que vea sus stats.
 */
export const vincularHijoSchema = z.object({
  codigoEscuela: z.string().trim().toLowerCase().min(2, { error: "Código de escuela requerido." }).max(60),
  codigoJugador: z.string().trim().toUpperCase().min(4, { error: "Código de jugador requerido." }).max(12),
  padreNombre: z.string().trim().min(2, { error: "Tu nombre es requerido." }).max(120),
  padreEmail: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  password: passwordSchema,
});

export type VincularHijoInput = z.infer<typeof vincularHijoSchema>;
