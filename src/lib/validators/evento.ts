import { z } from "zod";
import { TIPOS_EVENTO, CONFIRMACIONES } from "@/types";
import { textoSeguro } from "@/lib/validators/sanitizar";

// Tope de duración de un evento. La UI ofrece hasta 6h + 45' (ver
// CrearEventoDialog/EditarEventoDialog); acá se deja un margen sobre eso
// porque una Server Action es un endpoint HTTP y el tope de la UI es solo
// cortesía del navegador — sin este refine, sacar `mismoDia()` (que antes
// limitaba la duración a <24h como efecto colateral) dejaba la duración sin
// techo real del lado del servidor.
const DURACION_MAXIMA_MS = 8 * 60 * 60 * 1000; // 8 horas

export const eventoSchema = z
  .object({
    categoriaId: z.string().min(1, { error: "Elige una categoría." }),
    tipo: z.enum(TIPOS_EVENTO),
    titulo: textoSeguro({ min: 2, max: 120, error: "Título requerido." }),
    canchaId: z.string().optional().or(z.literal("")),
    rival: textoSeguro({ max: 120 }).optional().or(z.literal("")),
    esLocal: z.coerce.boolean().optional(),
    inicio: z.coerce.date({ error: "Fecha de inicio inválida." }),
    fin: z.coerce.date({ error: "Fecha de fin inválida." }),
    notas: textoSeguro({ max: 2000 }).optional().or(z.literal("")),
    convocados: z.array(z.string().min(1)).optional(),
    repetirSemanal: z.coerce.boolean().optional(),
    repetirHasta: z.coerce.date().optional(),
  })
  .refine((d) => d.fin >= d.inicio, {
    error: "El fin debe ser posterior al inicio.",
    path: ["fin"],
  })
  .refine((d) => d.fin.getTime() - d.inicio.getTime() <= DURACION_MAXIMA_MS, {
    error: "La duración no puede superar las 8 horas.",
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

/** Edición de un evento: mismos campos que el alta salvo categoría/convocados/recurrencia. */
export const editarEventoSchema = z
  .object({
    eventoId: z.string().min(1),
    titulo: textoSeguro({ min: 2, max: 120, error: "Título requerido." }),
    canchaId: z.string().optional().or(z.literal("")),
    rival: textoSeguro({ max: 120 }).optional().or(z.literal("")),
    esLocal: z.coerce.boolean().optional(),
    inicio: z.coerce.date({ error: "Fecha de inicio inválida." }),
    fin: z.coerce.date({ error: "Fecha de fin inválida." }),
    notas: textoSeguro({ max: 2000 }).optional().or(z.literal("")),
  })
  .refine((d) => d.fin >= d.inicio, {
    error: "El fin debe ser posterior al inicio.",
    path: ["fin"],
  })
  .refine((d) => d.fin.getTime() - d.inicio.getTime() <= DURACION_MAXIMA_MS, {
    error: "La duración no puede superar las 8 horas.",
    path: ["fin"],
  });

export type EditarEventoInput = z.infer<typeof editarEventoSchema>;

/** Estadística individual de un jugador en un partido. */
export const estadisticaSchema = z.object({
  titular: z.coerce.boolean().optional().default(false),
  goles: z.coerce.number().int().min(0).max(99).default(0),
  asistencias: z.coerce.number().int().min(0).max(99).default(0),
  amarillas: z.coerce.number().int().min(0).max(2).default(0),
  roja: z.coerce.boolean().optional().default(false),
  azul: z.coerce.boolean().optional().default(false),
});

export type EstadisticaInput = z.infer<typeof estadisticaSchema>;
