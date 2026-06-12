import { z } from "zod";
import { GENEROS_AVATAR } from "@/types";

export const avatarConfigSchema = z.object({
  genero: z.enum(GENEROS_AVATAR),
  piel: z.coerce.number().int().min(0).max(5),
  peinado: z.coerce.number().int().min(0).max(5),
  cabello: z.coerce.number().int().min(0).max(5),
});

export type AvatarConfigInput = z.infer<typeof avatarConfigSchema>;
