import { z } from "zod";
import { POSICIONES, TIPOS_BLOQUEO } from "@/types";

// Validadores de la gestión administrativa (Sprint G).

export const jugadorEditarSchema = z.object({
  jugadorId: z.string().min(1),
  nombre: z.string().trim().min(2, { error: "Nombre requerido." }).max(60),
  apellido: z.string().trim().min(2, { error: "Apellido requerido." }).max(60),
  fechaNacimiento: z.coerce.date(),
  posicion: z.enum(POSICIONES),
  dorsal: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(99)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  categoriaId: z.string().min(1, { error: "Elige una categoría." }),
});

export const estadoJugadorSchema = z.object({
  jugadorId: z.string().min(1),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
  motivo: z.string().trim().min(3, { error: "Indica el motivo." }).max(200),
});

export const eliminarJugadorSchema = z.object({
  jugadorId: z.string().min(1),
  confirmacion: z.string().trim().min(1, { error: "Escribe el nombre del jugador." }),
  motivo: z.string().trim().min(3, { error: "Indica el motivo." }).max(200),
});

export const bloqueoSchema = z.object({
  jugadorId: z.string().min(1),
  tipo: z.enum(TIPOS_BLOQUEO),
  mensaje: z.string().trim().max(300).optional(),
});

export const dtEditarSchema = z.object({
  entrenadorId: z.string().min(1),
  nombre: z.string().trim().min(2, { error: "Nombre requerido." }).max(120),
  activo: z.boolean(),
  categoriaIds: z
    .array(z.string().min(1))
    .min(1, { error: "Asigna al menos una categoría." }),
});

export const usuarioEditarSchema = z.object({
  userId: z.string().min(1),
  nombre: z.string().trim().min(2, { error: "Nombre requerido." }).max(120),
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  activo: z.boolean(),
});

export const escuelaEditarSchema = z.object({
  escuelaId: z.string().min(1),
  nombre: z.string().trim().min(2, { error: "Nombre requerido." }).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, { error: "Slug inválido (a-z, 0-9 y guiones)." }),
  colorPrimario: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, {
    error: "Color inválido (usa formato #RRGGBB).",
  }),
  activa: z.boolean(),
});

export const cambiarPasswordSchema = z
  .object({
    actual: z.string().min(1, { error: "Escribe tu contraseña actual." }),
    nueva: z
      .string()
      .min(8, { error: "Mínimo 8 caracteres." })
      .max(72, { error: "Máximo 72 caracteres." }),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    error: "La confirmación no coincide.",
    path: ["confirmacion"],
  });

export type JugadorEditarInput = z.infer<typeof jugadorEditarSchema>;
export type DtEditarInput = z.infer<typeof dtEditarSchema>;
export type UsuarioEditarInput = z.infer<typeof usuarioEditarSchema>;
export type EscuelaEditarInput = z.infer<typeof escuelaEditarSchema>;
