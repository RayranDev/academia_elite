import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth/config";
import { loginSchema } from "@/lib/validators/auth";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import type { Rol } from "@/types";

/**
 * Instancia principal de Auth.js (runtime Node). Incluye el provider Credentials
 * con acceso a BD y bcrypt. El proxy/middleware usa una instancia aparte
 * (edge-safe) construida solo con authConfig.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.activo) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol as Rol,
          escuelaId: user.escuelaId,
        };
      },
    }),
  ],
});
