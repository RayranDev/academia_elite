import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";

export const TIPOS_DESCUENTO = ["PORCENTAJE", "MONTO_FIJO"] as const;

export const ETIQUETA_TIPO_DESCUENTO: Record<(typeof TIPOS_DESCUENTO)[number], string> = {
  PORCENTAJE: "Porcentaje",
  MONTO_FIJO: "Monto fijo",
};

const etiquetar = (mapa: Record<string, string>, valor: string) => mapa[valor] ?? valor;
export const etiquetaTipoDescuento = (v: string) => etiquetar(ETIQUETA_TIPO_DESCUENTO, v);

/** Campos comunes a alta y edición, antes del `.refine` cruzado (para poder `.extend`). */
const camposDescuentoRegla = z.object({
  categoriaId: z.string().min(1, { error: "Elige una categoría." }),
  // Texto libre corto (AGENTS.md §5: textoSeguro, no z.string() pelado).
  nombre: textoSeguro({ min: 1, max: 60, error: "Escribe un nombre." }),
  tipo: z.enum(TIPOS_DESCUENTO, { error: "Elige un tipo de descuento." }),
  valor: z.coerce.number().positive({ error: "El valor debe ser mayor que cero." }),
});

/** Un % no puede superar 100: no existe un descuento de más del 100% del monto. */
function refinarPorcentaje<T extends { tipo: string; valor: number }>(v: T): boolean {
  return v.tipo !== "PORCENTAJE" || v.valor <= 100;
}
const MENSAJE_PORCENTAJE = {
  error: "Un descuento porcentual no puede superar el 100%.",
  path: ["valor"] as PropertyKey[],
};

export const descuentoReglaSchema = camposDescuentoRegla.refine(
  refinarPorcentaje,
  MENSAJE_PORCENTAJE,
);

export type DescuentoReglaInput = z.infer<typeof descuentoReglaSchema>;

/** Edición de una regla ya existente: mismas reglas + el id. */
export const editarDescuentoReglaSchema = camposDescuentoRegla
  .extend({ id: z.string().min(1, { error: "Falta la regla a editar." }) })
  .refine(refinarPorcentaje, MENSAJE_PORCENTAJE);

export type EditarDescuentoReglaInput = z.infer<typeof editarDescuentoReglaSchema>;

export const asignarJugadoresSchema = z.object({
  reglaId: z.string().min(1, { error: "Falta la regla." }),
  jugadorIds: z.array(z.string()).default([]),
});

export type AsignarJugadoresInput = z.infer<typeof asignarJugadoresSchema>;
