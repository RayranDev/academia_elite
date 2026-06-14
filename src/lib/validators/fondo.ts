import { z } from "zod";
import { ORDEN_NIVEL } from "@/lib/fondos";

// Validadores del catálogo de fondos de carta (laboratorio del Súper Admin).

const REQUISITOS = ["SIEMPRE", "LOGRO", "NIVEL_CARTA", "NIVEL_PERSONAL"] as const;

const base = {
  nombre: z.string().trim().min(3, { error: "Nombre requerido." }).max(80),
  descripcion: z.string().trim().min(5, { error: "Descripción requerida." }).max(200),
  // CSS que se aplica como `background` de toda la carta (gradiente/patrón).
  estilo: z.string().trim().min(3, { error: "El estilo CSS es requerido." }).max(2000),
  colorTexto: z
    .union([z.literal(""), z.string().trim().max(40)])
    .optional()
    .transform((v) => (v ? v : null)),
  requisitoTipo: z.enum(REQUISITOS),
  requisitoValor: z
    .union([z.literal(""), z.string().trim().max(60)])
    .optional()
    .transform((v) => (v ? v : null)),
  orden: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(9999)])
    .optional()
    .transform((v) => (v === "" || v == null ? 0 : v)),
};

/**
 * El requisito necesita un valor coherente con su tipo. SIEMPRE no lleva valor;
 * NIVEL_CARTA debe ser un nivel válido; NIVEL_PERSONAL un entero; LOGRO un
 * código (su existencia la verifica el servicio contra el catálogo de logros).
 */
function requisitoCoherente(d: {
  requisitoTipo: (typeof REQUISITOS)[number];
  requisitoValor: string | null;
}): boolean {
  if (d.requisitoTipo === "SIEMPRE") return true;
  if (!d.requisitoValor) return false;
  if (d.requisitoTipo === "NIVEL_CARTA") {
    return (ORDEN_NIVEL as string[]).includes(d.requisitoValor);
  }
  if (d.requisitoTipo === "NIVEL_PERSONAL") return /^\d+$/.test(d.requisitoValor);
  return true; // LOGRO
}

const refinarRequisito = {
  error: "El requisito necesita un valor válido para su tipo.",
  path: ["requisitoValor"],
};

export const fondoCrearSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_]{3,60}$/, { error: "Código inválido (A-Z, 0-9 y _)." }),
    ...base,
  })
  .refine(requisitoCoherente, refinarRequisito);

export const fondoEditarSchema = z
  .object({ fondoId: z.string().min(1), ...base })
  .refine(requisitoCoherente, refinarRequisito);

export type FondoCrearInput = z.infer<typeof fondoCrearSchema>;
export type FondoEditarInput = z.infer<typeof fondoEditarSchema>;
