import { z } from "zod";

const num = z.coerce.number({ error: "Valor inválido." });

// Sprint y agilidad son segundos: 0 no es una marca físicamente posible.
// Salto (cm) y Yo-Yo (nivel) sí admiten 0 como peor marca teórica (un
// jugador que no despega o no completa ningún tramo).
export const editarRangosCategoriaSchema = z.object({
  categoriaId: z.string().min(1, { error: "Falta la categoría." }),
  sprintMin: num.positive({ error: "El sprint debe ser mayor que 0." }),
  sprintMax: num.positive({ error: "El sprint debe ser mayor que 0." }),
  saltoMin: num.nonnegative({ error: "El salto no puede ser negativo." }),
  saltoMax: num.nonnegative({ error: "El salto no puede ser negativo." }),
  agilidadMin: num.positive({ error: "La agilidad debe ser mayor que 0." }),
  agilidadMax: num.positive({ error: "La agilidad debe ser mayor que 0." }),
  yoyoMin: num.nonnegative({ error: "El Yo-Yo no puede ser negativo." }),
  yoyoMax: num.nonnegative({ error: "El Yo-Yo no puede ser negativo." }),
});

export type EditarRangosCategoriaInput = z.infer<typeof editarRangosCategoriaSchema>;
