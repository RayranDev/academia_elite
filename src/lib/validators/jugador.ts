import { z } from "zod";
import { POSICIONES } from "@/types";

export const jugadorSchema = z.object({
  nombre: z.string().trim().min(2, { error: "Nombre requerido." }).max(60),
  apellido: z.string().trim().min(2, { error: "Apellido requerido." }).max(60),
  fechaNacimiento: z.coerce.date({ error: "Fecha de nacimiento inválida." }),
  posicion: z.enum(POSICIONES),
  categoriaId: z.string().min(1, { error: "Elige una categoría." }),
  dorsal: z.coerce.number().int().min(1).max(99).optional(),
});

export type JugadorInput = z.infer<typeof jugadorSchema>;
