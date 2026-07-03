import { z } from "zod";
import { passwordSchema } from "@/lib/validators/auth";

const codigoSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: "El código son 6 dígitos." });

/** Pedir el código de recuperación: solo el email. */
export const solicitarRecuperacionSchema = z.object({
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
});

/** Fijar una contraseña nueva con el código (recuperación o alta de cuenta). */
export const fijarPasswordSchema = z
  .object({
    email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
    codigo: codigoSchema,
    password: passwordSchema,
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });

/** Confirmar el correo (usuario logueado) con su código. */
export const verificarCodigoSchema = z.object({
  codigo: codigoSchema,
});
