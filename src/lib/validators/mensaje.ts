import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";

const cuerpo = textoSeguro({ min: 1, max: 2000, error: "Escribe un mensaje." });

export const crearConversacionSchema = z.object({
  jugadorId: z.string().min(1, { error: "Elige un jugador." }),
  asunto: textoSeguro({ min: 2, max: 120, error: "Asunto requerido." }),
  cuerpo,
});

export const responderSchema = z.object({
  conversacionId: z.string().min(1),
  cuerpo,
});

export const anuncioSchema = z.object({
  categoriaId: z.string().optional().or(z.literal("")), // "" = global
  titulo: textoSeguro({ min: 2, max: 120, error: "Título requerido." }),
  cuerpo: textoSeguro({ min: 2, max: 2000, error: "Cuerpo requerido." }),
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
