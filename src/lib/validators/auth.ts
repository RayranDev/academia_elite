import { z } from "zod";
import { isCommonPassword } from "@/lib/auth/password";

export const passwordSchema = z
  .string()
  .min(8, { error: "La contraseña debe tener al menos 8 caracteres." })
  .max(72, { error: "La contraseña es demasiado larga." })
  .refine((p) => !isCommonPassword(p), {
    error: "Esa contraseña es demasiado común, elige otra.",
  });

export const loginSchema = z.object({
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
