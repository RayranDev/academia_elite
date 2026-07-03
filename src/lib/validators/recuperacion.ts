import { z } from "zod";
import { passwordSchema } from "@/lib/validators/auth";

/** Pedir el enlace de recuperación: solo el email. */
export const solicitarRecuperacionSchema = z.object({
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
});

/** Fijar una contraseña nueva desde un enlace (recuperación o alta de cuenta). */
export const fijarPasswordSchema = z
  .object({
    token: z.string().min(10, { error: "Enlace inválido." }),
    password: passwordSchema,
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });
