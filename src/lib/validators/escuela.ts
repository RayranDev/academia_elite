import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Envío de un código de invitación al correo de una familia. */
export const enviarCodigoSchema = z.object({
  codigoId: z.string().min(1, { error: "Código inválido." }),
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
});

export const brandingSchema = z.object({
  nombre: textoSeguro({ min: 2, max: 120 }).optional(),
  colorPrimario: z.string().trim().regex(HEX, {
    error: "Color inválido (usa formato #RRGGBB).",
  }),
  frecuenciaEvaluacionDias: z.coerce
    .number()
    .int()
    .min(1, { error: "Mínimo 1 día." })
    .max(365, { error: "Máximo 365 días." }),
});

const anioCategoria = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.coerce.number().int().min(1990).max(2100).optional(),
);

export const categoriaSchema = z
  .object({
    nombre: textoSeguro({ min: 2, max: 60, error: "Nombre requerido." }),
    sinEdad: z.boolean(),
    anioDesde: anioCategoria,
    anioHasta: anioCategoria,
  })
  .refine((d) => d.sinEdad || (d.anioDesde != null && d.anioHasta != null), {
    error: 'Elige año desde y año hasta, o marca "Categoría sin edad".',
    path: ["anioDesde"],
  })
  .refine(
    (d) => d.sinEdad || d.anioDesde == null || d.anioHasta == null || d.anioHasta >= d.anioDesde,
    { error: "El año final debe ser ≥ al inicial.", path: ["anioHasta"] },
  )
  .transform((d) => ({
    nombre: d.nombre,
    anioDesde: d.sinEdad ? null : (d.anioDesde ?? null),
    anioHasta: d.sinEdad ? null : (d.anioHasta ?? null),
  }));

export const sedeSchema = z.object({
  nombre: textoSeguro({ min: 2, max: 80, error: "Nombre requerido." }),
  direccion: textoSeguro({ max: 160 }).optional().or(z.literal("")),
});

export const canchaSchema = z.object({
  sedeId: z.string().min(1),
  nombre: textoSeguro({ min: 1, max: 60, error: "Nombre requerido." }),
});

export const dtSchema = z.object({
  nombre: textoSeguro({ min: 2, max: 120, error: "Nombre requerido." }),
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  categoriaIds: z
    .array(z.string().min(1))
    .min(1, { error: "Asigna al menos una categoría." }),
});

export const codigoSchema = z.object({
  categoriaId: z.string().min(1, { error: "Elige una categoría." }),
  usosMaximos: z.coerce
    .number({ error: "Indica un número." })
    .int({ error: "Debe ser un número entero." })
    .min(1, { error: "Mínimo 1 uso." })
    .max(100, { error: "Máximo 100 usos." }),
  diasValidez: z.coerce
    .number({ error: "Indica un número." })
    .int({ error: "Debe ser un número entero." })
    .min(1, { error: "Mínimo 1 día de validez." })
    .max(365, { error: "Máximo 365 días de validez." }),
});

export type BrandingInput = z.infer<typeof brandingSchema>;
export type DtInput = z.infer<typeof dtSchema>;
