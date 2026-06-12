import { z } from "zod";
import { POSICIONES, TIPOS_LOGRO, STATS_CARTA } from "@/types";

// Validadores del catálogo de logros (G6).

const base = {
  nombre: z.string().trim().min(3, { error: "Nombre requerido." }).max(80),
  descripcion: z.string().trim().min(5, { error: "Descripción requerida." }).max(200),
  tipo: z.enum(TIPOS_LOGRO),
  statBonus: z
    .union([z.literal(""), z.enum([...STATS_CARTA, "MEN"] as const)])
    .optional()
    .transform((v) => (v ? v : null)),
  valorBonus: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(3)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  repetible: z.boolean(),
  posicion: z
    .union([z.literal(""), z.enum(POSICIONES)])
    .optional()
    .transform((v) => (v ? v : null)),
  icono: z.string().trim().min(1).max(40).default("medal"),
};

export const logroCrearSchema = z
  .object({ codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{4,60}$/, { error: "Código inválido (A-Z, 0-9 y _)." }), ...base })
  .refine((d) => d.tipo !== "BONUS" || (d.statBonus && d.valorBonus), {
    error: "Un logro BONUS necesita stat y valor.",
    path: ["statBonus"],
  });

export const logroEditarSchema = z.object({
  logroId: z.string().min(1),
  nombre: base.nombre,
  descripcion: base.descripcion,
});

export const logroActivoSchema = z.object({
  logroId: z.string().min(1),
  activo: z.boolean(),
});

export const logroVentanaSchema = z
  .object({
    logroId: z.string().min(1),
    activo: z.boolean(),
    desde: z
      .union([z.literal(""), z.coerce.date()])
      .optional()
      .transform((v) => (v instanceof Date ? v : null)),
    hasta: z
      .union([z.literal(""), z.coerce.date()])
      .optional()
      .transform((v) => (v instanceof Date ? v : null)),
  })
  .refine((d) => !d.desde || !d.hasta || d.hasta >= d.desde, {
    error: "La fecha final debe ser posterior a la inicial.",
    path: ["hasta"],
  });

export const otorgarLogroSchema = z.object({
  logroId: z.string().min(1),
  jugadorId: z.string().min(1),
});

export type LogroCrearInput = z.infer<typeof logroCrearSchema>;
export type LogroVentanaInput = z.infer<typeof logroVentanaSchema>;
