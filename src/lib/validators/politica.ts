import { z } from "zod";

/**
 * Aceptación de la Política en el primer ingreso de la familia. La casilla es la
 * única entrada: el servidor la exige igual que el botón deshabilitado del
 * cliente (defensa en profundidad: un POST directo sin casilla no sella nada).
 */
export const aceptarPoliticaSchema = z.object({
  aceptaTerminos: z.literal("on", {
    error: "Debes aceptar la Política para continuar.",
  }),
});
