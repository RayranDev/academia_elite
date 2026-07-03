import { z } from "zod";
import { POSICIONES } from "@/types";
import { passwordSchema } from "@/lib/validators/auth";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { formatearNombre } from "@/lib/texto/formatear-nombre";

// Aceptación obligatoria de la Política de Tratamiento de Datos (habeas data). El
// checkbox del formulario envía "on"; si falta, el registro se rechaza.
const aceptaTerminosSchema = z.literal("on", {
  error: "Debés aceptar la Política de Tratamiento de Datos para continuar.",
});

/**
 * Auto-registro del padre con código de invitación. Crea su cuenta (rol JUGADOR,
 * gestionada por el padre) y el jugador en estado PENDIENTE hasta que el DT apruebe.
 */
export const registroSchema = z.object({
  codigo: z.string().trim().toUpperCase().min(4).max(12),
  // Cuenta del padre/tutor
  padreNombre: textoSeguro({ min: 2, max: 120, error: "Tu nombre es requerido." }).transform(formatearNombre),
  padreEmail: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  password: passwordSchema,
  // Datos del hijo/a
  jugadorNombre: textoSeguro({ min: 2, max: 60, error: "Nombre del jugador requerido." }).transform(formatearNombre),
  jugadorApellido: textoSeguro({ min: 2, max: 60, error: "Apellido requerido." }).transform(formatearNombre),
  fechaNacimiento: z.coerce.date({ error: "Fecha de nacimiento inválida." }),
  posicion: z.enum(POSICIONES),
  aceptaTerminos: aceptaTerminosSchema,
});

export type RegistroInput = z.infer<typeof registroSchema>;

/**
 * Vinculación del padre con un hijo YA creado: el padre crea su cuenta e indica
 * el código de la escuela (slug o codigoRef "ESC-…") y el código del jugador. La
 * BD vincula su cuenta al perfil del hijo para que vea sus stats.
 */
export const vincularHijoSchema = z.object({
  // Sin lowercase: el codigoRef es en mayúsculas. El repo normaliza ambos casos.
  codigoEscuela: z.string().trim().min(2, { error: "Código de escuela requerido." }).max(60),
  codigoJugador: z.string().trim().toUpperCase().min(4, { error: "Código de jugador requerido." }).max(12),
  padreNombre: textoSeguro({ min: 2, max: 120, error: "Tu nombre es requerido." }).transform(formatearNombre),
  padreEmail: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  password: passwordSchema,
  aceptaTerminos: aceptaTerminosSchema,
});

export type VincularHijoInput = z.infer<typeof vincularHijoSchema>;
