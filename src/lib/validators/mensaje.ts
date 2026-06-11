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
});
