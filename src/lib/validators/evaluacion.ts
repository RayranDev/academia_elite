import { z } from "zod";

const nota = z
  .coerce.number()
  .min(1, { error: "Mínimo 1." })
  .max(10, { error: "Máximo 10." });

const medidaFisica = z.coerce
  .number()
  .positive({ error: "Debe ser un número positivo." })
  .max(1000);

export const evaluacionSchema = z.object({
  jugadorId: z.string().min(1),
  // Físicas (medidas reales)
  sprint30mSeg: medidaFisica,
  saltoVerticalCm: medidaFisica,
  agilidadIllinoisSeg: medidaFisica,
  resistenciaYoyoNivel: medidaFisica,
  // Técnicas (1-10)
  controlBalon: nota,
  pase: nota,
  tiro: nota,
  regate: nota,
  // Mentalidad (1-10)
  actitud: nota,
  concentracion: nota,
  trabajoEquipo: nota,
  resiliencia: nota,
  observacionesPrivadas: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type EvaluacionInput = z.infer<typeof evaluacionSchema>;

export const anularEvaluacionSchema = z.object({
  evaluacionId: z.string().min(1),
  motivo: z.string().trim().min(5, { error: "Indica un motivo (mín. 5 caracteres)." }).max(300),
});
