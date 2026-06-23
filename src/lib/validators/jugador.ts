import { z } from "zod";
import { POSICIONES } from "@/types";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { formatearNombre } from "@/lib/texto/formatear-nombre";

export const jugadorSchema = z.object({
  nombre: textoSeguro({ min: 2, max: 60, error: "Nombre requerido." }).transform(formatearNombre),
  apellido: textoSeguro({ min: 2, max: 60, error: "Apellido requerido." }).transform(formatearNombre),
  fechaNacimiento: z.coerce.date({ error: "Fecha de nacimiento inválida." }),
  posicion: z.enum(POSICIONES),
  categoriaId: z.string().min(1, { error: "Elige una categoría." }),
  dorsal: z.coerce.number().int().min(1).max(99).optional(),
});

export type JugadorInput = z.infer<typeof jugadorSchema>;
