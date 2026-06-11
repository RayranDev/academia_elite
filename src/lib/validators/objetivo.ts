import { z } from "zod";
import { STATS_OBJETIVO } from "@/types";

export const objetivoSchema = z.object({
  jugadorId: z.string().min(1),
  stat: z.enum(STATS_OBJETIVO),
  valorMeta: z.coerce.number().int().min(1).max(99),
  fechaLimite: z.coerce.date({ error: "Fecha límite inválida." }),
});

export type ObjetivoInput = z.infer<typeof objetivoSchema>;
