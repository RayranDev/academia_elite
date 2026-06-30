import { z } from "zod";
import { ORDEN_NIVEL } from "@/lib/fondos";
import { EFECTOS_CARTA, TINTAS_METAL, TRAMAS_PATRON } from "@/types";

// Validadores del catálogo de fondos de carta (laboratorio del Súper Admin).

const REQUISITOS = ["SIEMPRE", "LOGRO", "NIVEL_CARTA", "NIVEL_PERSONAL"] as const;

// Parámetros del efecto. Llegan serializados como JSON en un input oculto del
// formulario; acá se parsean y se validan campo a campo.
const efectoParamsSchema = z
  .object({
    intensidad: z.coerce.number().min(0).max(1).optional(),
    tinte: z.enum(TINTAS_METAL).optional(),
    tramaPatron: z.enum(TRAMAS_PATRON).optional(),
    velocidad: z.coerce.number().min(0.5).max(30).optional(),
  })
  .strict();

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
  // Pack de efecto del fondo (motor de efectos). NINGUNO = solo el `estilo` base.
  efecto: z.enum(EFECTOS_CARTA).default("NINGUNO"),
  // Llega como JSON serializado (o ""); se parsea a objeto o null.
  efectoParams: z
    .union([z.literal(""), z.string()])
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      let crudo: unknown;
      try {
        crudo = JSON.parse(v);
      } catch {
        ctx.addIssue({ code: "custom", message: "Parámetros de efecto inválidos." });
        return z.NEVER;
      }
      const r = efectoParamsSchema.safeParse(crudo);
      if (!r.success) {
        ctx.addIssue({ code: "custom", message: "Parámetros de efecto inválidos." });
        return z.NEVER;
      }
      return r.data;
    }),
};

// El efecto Trama necesita un patrón para saber qué SVG tilea.
const tramaCoherente = (d: {
  efecto: (typeof EFECTOS_CARTA)[number];
  efectoParams: { tramaPatron?: string } | null;
}): boolean => d.efecto !== "TRAMA" || Boolean(d.efectoParams?.tramaPatron);

const refinarTrama = {
  error: "El efecto Trama requiere un patrón.",
  path: ["efectoParams"],
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
  .refine(requisitoCoherente, refinarRequisito)
  .refine(tramaCoherente, refinarTrama);

export const fondoEditarSchema = z
  .object({ fondoId: z.string().min(1), ...base })
  .refine(requisitoCoherente, refinarRequisito)
  .refine(tramaCoherente, refinarTrama);

export type FondoCrearInput = z.infer<typeof fondoCrearSchema>;
export type FondoEditarInput = z.infer<typeof fondoEditarSchema>;
