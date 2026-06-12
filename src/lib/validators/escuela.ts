import { z } from "zod";

const HEX = /^#[0-9a-fA-F]{6}$/;

export const brandingSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  colorPrimario: z.string().trim().regex(HEX, {
    error: "Color inválido (usa formato #RRGGBB).",
  }),
  frecuenciaEvaluacionDias: z.coerce
    .number()
    .int()
    .min(1, { error: "Mínimo 1 día." })
    .max(365, { error: "Máximo 365 días." }),
});

export const categoriaSchema = z
  .object({
    nombre: z.string().trim().min(2, { error: "Nombre requerido." }).max(60),
    anioDesde: z.coerce.number().int().min(1990).max(2100),
    anioHasta: z.coerce.number().int().min(1990).max(2100),
  })
  .refine((d) => d.anioHasta >= d.anioDesde, {
    error: "El año final debe ser ≥ al inicial.",
    path: ["anioHasta"],
  });

export const sedeSchema = z.object({
  nombre: z.string().trim().min(2, { error: "Nombre requerido." }).max(80),
  direccion: z.string().trim().max(160).optional().or(z.literal("")),
});

export const canchaSchema = z.object({
  sedeId: z.string().min(1),
  nombre: z.string().trim().min(1, { error: "Nombre requerido." }).max(60),
});

export const dtSchema = z.object({
  nombre: z.string().trim().min(2, { error: "Nombre requerido." }).max(120),
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  categoriaIds: z
    .array(z.string().min(1))
    .min(1, { error: "Asigna al menos una categoría." }),
});

export const codigoSchema = z.object({
  categoriaId: z.string().min(1, { error: "Elige una categoría." }),
  usosMaximos: z.coerce.number().int().min(1).max(100),
  diasValidez: z.coerce.number().int().min(1).max(365),
});

export type BrandingInput = z.infer<typeof brandingSchema>;
export type DtInput = z.infer<typeof dtSchema>;
