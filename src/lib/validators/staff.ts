import { z } from "zod";
import { textoSeguro } from "@/lib/validators/sanitizar";
import { telefonoOpcional } from "@/lib/validators/cuenta";

export const CARGOS_STAFF = [
  "COORDINADOR",
  "PREPARADOR_FISICO",
  "UTILERO",
  "OTRO",
] as const;

export const ETIQUETA_CARGO_STAFF: Record<(typeof CARGOS_STAFF)[number], string> = {
  COORDINADOR: "Coordinador",
  PREPARADOR_FISICO: "Preparador físico",
  UTILERO: "Utilero",
  OTRO: "Otro",
};

const etiquetar = (mapa: Record<string, string>, valor: string) => mapa[valor] ?? valor;
export const etiquetaCargoStaff = (v: string) => etiquetar(ETIQUETA_CARGO_STAFF, v);

/** Email opcional del staff: vacío se normaliza a null (mismo criterio que `telefonoOpcional`). */
const emailOpcional = z
  .union([z.literal(""), z.email({ error: "Email inválido." }).trim().toLowerCase()])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

/** Campos comunes a alta y edición (para poder `.extend`). */
const camposStaff = z.object({
  cargo: z.enum(CARGOS_STAFF, { error: "Elige un cargo." }),
  // Texto libre corto (AGENTS.md §5: textoSeguro, no z.string() pelado).
  nombre: textoSeguro({ min: 2, max: 80, error: "Escribe un nombre." }),
  telefono: telefonoOpcional,
  email: emailOpcional,
});

export const staffSchema = camposStaff;
export type StaffInput = z.infer<typeof staffSchema>;

/** Edición de un registro ya existente: mismas reglas + el id. */
export const editarStaffSchema = camposStaff.extend({
  id: z.string().min(1, { error: "Falta el staff a editar." }),
});

export type EditarStaffInput = z.infer<typeof editarStaffSchema>;
