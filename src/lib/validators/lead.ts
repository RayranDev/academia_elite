import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { CODIGOS_PAIS } from "@/lib/indicativos";

/** Datos del lead que se persisten (frontera de dominio). */
export const leadSchema = z.object({
  nombreEscuela: textoSeguro({ min: 2, max: 120, error: "Indica el nombre de la escuela." }),
  contactoNombre: textoSeguro({ min: 2, max: 120, error: "Indica tu nombre." }),
  contactoEmail: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  // Teléfono OBLIGATORIO (indicativo + número), ya combinado.
  telefono: z.string().trim().min(5, { error: "El teléfono es obligatorio." }).max(40),
  ciudad: textoSeguro({ max: 80 }).optional().or(z.literal("")),
  mensaje: textoSeguro({ max: 2000 }).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

/**
 * Esquema del formulario público: el teléfono llega como indicativo + número
 * (validado que sean solo dígitos). Añade el honeypot (`website`) y
 * `renderizadoEn` (epoch ms) para descartar envíos demasiado rápidos (bots).
 */
export const leadFormSchema = z.object({
  nombreEscuela: textoSeguro({ min: 2, max: 120, error: "Indica el nombre de la escuela." }),
  contactoNombre: textoSeguro({ min: 2, max: 120, error: "Indica tu nombre." }),
  contactoEmail: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  codigoPais: z.enum(CODIGOS_PAIS as [string, ...string[]], { error: "Elige el indicativo." }),
  numeroTelefono: z
    .string()
    .trim()
    .regex(/^[0-9]{6,15}$/, { error: "El número debe tener solo dígitos (6 a 15)." }),
  ciudad: textoSeguro({ max: 80 }).optional().or(z.literal("")),
  mensaje: textoSeguro({ max: 2000 }).optional().or(z.literal("")),
  website: z.string().optional(), // honeypot
  renderizadoEn: z.coerce.number().int().optional(),
});

export type LeadFormInput = z.infer<typeof leadFormSchema>;
