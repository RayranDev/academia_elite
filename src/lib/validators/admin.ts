import { z } from "zod";
import { ESTADOS_LEAD } from "@/types";

export const actualizarEstadoLeadSchema = z.object({
  leadId: z.string().min(1),
  estado: z.enum(ESTADOS_LEAD),
});

export const convertirLeadSchema = z.object({
  leadId: z.string().min(1),
  nombreEscuela: z.string().trim().min(2, { error: "Nombre de escuela requerido." }).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, { error: "Slug requerido." })
    .max(40)
    .regex(/^[a-z0-9-]+$/, {
      error: "El slug solo admite minúsculas, números y guiones.",
    }),
  adminNombre: z.string().trim().min(2, { error: "Nombre del admin requerido." }).max(120),
  adminEmail: z.email({ error: "Email del admin inválido." }).trim().toLowerCase(),
});

export const actualizarParametroSchema = z.object({
  clave: z.string().min(1),
  valor: z.coerce.number().finite({ error: "Valor numérico inválido." }),
});

export type ConvertirLeadInput = z.infer<typeof convertirLeadSchema>;
