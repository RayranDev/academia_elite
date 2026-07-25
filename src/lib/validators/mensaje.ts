import { z } from "zod";

const cuerpo = z
  .string()
  .trim()
  .min(1, { error: "Escribe un mensaje." })
  .max(2000, { error: "Máximo 2000 caracteres." });

export const crearConversacionSchema = z.object({
  jugadorId: z.string().min(1, { error: "Elige un jugador." }),
  asunto: z.string().trim().min(2, { error: "Asunto requerido." }).max(120),
  cuerpo,
});

export const responderSchema = z.object({
  conversacionId: z.string().min(1),
  cuerpo,
});

export const anuncioSchema = z.object({
  categoriaId: z.string().optional().or(z.literal("")), // "" = global
  titulo: z.string().trim().min(2, { error: "Título requerido." }).max(120),
  cuerpo: z.string().trim().min(2, { error: "Cuerpo requerido." }).max(2000),
  visibleJugador: z.coerce.boolean().optional(),
  fijado: z.coerce.boolean().optional(),
  // Caducidad opcional: fecha "yyyy-MM-dd". Vacío = no vence. Se toma hasta el
  // FIN de ese día (23:59:59) para que el día elegido siga siendo visible.
  caducaEn: z
    .string()
    .trim()
    .transform((v) => (v.length > 0 ? new Date(`${v}T23:59:59`) : null))
    .nullish()
    .refine((d) => d == null || !Number.isNaN(d.getTime()), {
      error: "Fecha de caducidad inválida.",
    }),
});
