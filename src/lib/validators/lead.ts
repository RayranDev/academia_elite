import { z } from "zod";

const texto = (max: number) => z.string().trim().max(max);

/** Datos del lead que se persisten (frontera de dominio). */
export const leadSchema = z.object({
  nombreEscuela: texto(120).min(2, { error: "Indica el nombre de la escuela." }),
  contactoNombre: texto(120).min(2, { error: "Indica tu nombre." }),
  contactoEmail: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  telefono: texto(40).optional().or(z.literal("")),
  ciudad: texto(80).optional().or(z.literal("")),
  mensaje: texto(2000).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

/**
 * Esquema del formulario público: añade el honeypot (`website`, debe ir vacío)
 * y `renderizadoEn` (epoch ms) para descartar envíos demasiado rápidos (bots).
 */
export const leadFormSchema = leadSchema.extend({
  // honeypot: acepta cualquier valor; el handler lo filtra en silencio (200).
  website: z.string().optional(),
  renderizadoEn: z.coerce.number().int().optional(),
});

export type LeadFormInput = z.infer<typeof leadFormSchema>;
