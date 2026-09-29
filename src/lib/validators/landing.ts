import { z } from "zod";
import { tieneContenidoPeligroso } from "@/lib/validators/sanitizar";
import { HERO_LANDING_IDS } from "@/lib/landing-heroes";

// Validadores de la landing pública (`/e/[slug]`) que edita el ESCUELA_ADMIN
// desde `src/app/escuela/branding/page.tsx`. Escaparate + contacto, sin
// formularios de captura: por eso no hay nada de leads acá.

/**
 * Texto libre opcional: "" se guarda como null (columna nullable en Prisma).
 * Mismas reglas que `textoSeguro`, pero armado a mano porque `textoSeguro` solo
 * aplica su `error` al `.min()`: acá no hay mínimo, y el mensaje propio tiene
 * que ir en el `.max()` o nunca se muestra.
 */
function textoOpcional(max: number, error?: string) {
  return z
    .string()
    .trim()
    .max(max, error ? { error } : undefined)
    .refine((v) => !tieneContenidoPeligroso(v), {
      error: "No se permite contenido HTML ni scripts.",
    })
    .optional()
    .transform((v) => (v ? v : null));
}

/**
 * WhatsApp: la UI acepta "+", espacios, guiones y paréntesis en la entrada
 * (como lo escribiría cualquiera); se normaliza a solo dígitos porque el link
 * `wa.me/<digitos>` no acepta separadores. 8–15 dígitos cubre indicativo +
 * número en cualquier país.
 */
export const whatsappSchema = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const digitos = v.replace(/[^0-9]/g, "");
    if (digitos.length < 8 || digitos.length > 15) {
      ctx.addIssue({
        code: "custom",
        message: "El WhatsApp debe tener entre 8 y 15 dígitos (incluye el indicativo).",
      });
      return z.NEVER;
    }
    return digitos;
  });

/** Handle de Instagram: acepta "@usuario" o una URL completa y normaliza a solo el handle. */
export function normalizarHandleInstagram(valor: string): string {
  let s = valor.trim();
  const m = s.match(/^https?:\/\/(?:www\.)?instagram\.com\/([^/?#]+)/i);
  if (m) s = m[1];
  return s.replace(/^@/, "");
}

export const instagramSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const handle = normalizarHandleInstagram(v);
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
      ctx.addIssue({
        code: "custom",
        message: "Usuario de Instagram inválido (letras, números, puntos y guion bajo).",
      });
      return z.NEVER;
    }
    return handle;
  });

export const contactoEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const r = z.email().safeParse(v);
    if (!r.success) {
      ctx.addIssue({ code: "custom", message: "Email de contacto inválido." });
      return z.NEVER;
    }
    return r.data;
  });

export const heroIdSchema = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!HERO_LANDING_IDS.includes(v)) {
      ctx.addIssue({ code: "custom", message: "Portada inválida." });
      return z.NEVER;
    }
    return v;
  });

/** Landing pública editable por el ESCUELA_ADMIN (Sección 6: dominio en español). */
export const landingSchema = z.object({
  publicada: z.boolean(),
  titular: textoOpcional(80, "El titular no puede superar los 80 caracteres."),
  descripcion: textoOpcional(500, "La descripción no puede superar los 500 caracteres."),
  heroId: heroIdSchema,
  whatsapp: whatsappSchema,
  email: contactoEmailSchema,
  instagram: instagramSchema,
});

export type LandingInput = z.infer<typeof landingSchema>;
