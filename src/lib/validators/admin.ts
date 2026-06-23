import { z } from "zod";
import { ESTADOS_LEAD } from "@/types";
import { formatearNombre } from "@/lib/texto/formatear-nombre";
import { textoSeguro } from "@/lib/validators/sanitizar";

export const actualizarEstadoLeadSchema = z.object({
  leadId: z.string().min(1),
  estado: z.enum(ESTADOS_LEAD),
});

export const convertirLeadSchema = z.object({
  leadId: z.string().min(1),
  nombreEscuela: textoSeguro({ min: 2, max: 120, error: "Nombre de escuela requerido." }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, { error: "Slug requerido." })
    .max(40)
    .regex(/^[a-z0-9-]+$/, {
      error: "El slug solo admite minúsculas, números y guiones.",
    }),
  adminNombre: textoSeguro({ min: 2, max: 120, error: "Nombre del admin requerido." }).transform(
    formatearNombre,
  ),
  adminEmail: z.email({ error: "Email del admin inválido." }).trim().toLowerCase(),
});

// Alta directa de escuela: mismos campos que la conversión de lead, sin leadId.
export const crearEscuelaSchema = convertirLeadSchema.omit({ leadId: true });

export const actualizarParametroSchema = z.object({
  clave: z.string().min(1),
  valor: z.coerce.number().finite({ error: "Valor numérico inválido." }),
});

export type ConvertirLeadInput = z.infer<typeof convertirLeadSchema>;
export type CrearEscuelaInput = z.infer<typeof crearEscuelaSchema>;
