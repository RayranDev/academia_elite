import { z } from "zod";
import { TIPOS_EVENTO, CONFIRMACIONES } from "@/types";

export const eventoSchema = z
  .object({
    categoriaId: z.string().min(1, { error: "Elige una categoría." }),
    tipo: z.enum(TIPOS_EVENTO),
    titulo: z.string().trim().min(2, { error: "Título requerido." }).max(120),
    canchaId: z.string().optional().or(z.literal("")),
    rival: z.string().trim().max(120).optional().or(z.literal("")),
    esLocal: z.coerce.boolean().optional(),
    inicio: z.coerce.date({ error: "Fecha de inicio inválida." }),
    fin: z.coerce.date({ error: "Fecha de fin inválida." }),
    notas: z.string().trim().max(2000).optional().or(z.literal("")),
    convocados: z.array(z.string().min(1)).optional(),
    repetirSemanal: z.coerce.boolean().optional(),
    repetirHasta: z.coerce.date().optional(),
  })
  .refine((d) => d.fin >= d.inicio, {
    error: "El fin debe ser posterior al inicio.",
    path: ["fin"],
  });

export type EventoInput = z.infer<typeof eventoSchema>;

export const confirmarConvocatoriaSchema = z.object({
  eventoId: z.string().min(1),
  jugadorId: z.string().min(1),
  confirmacion: z.enum(CONFIRMACIONES),
});

export const resultadoSchema = z.object({
  eventoId: z.string().min(1),
  resultadoLocal: z.coerce.number().int().min(0).max(99),
  resultadoVisitante: z.coerce.number().int().min(0).max(99),
});
