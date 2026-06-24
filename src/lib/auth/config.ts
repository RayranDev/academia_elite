import type { NextAuthConfig } from "next-auth";
import type { Rol } from "@/types";

/**
 * Config base de Auth.js — edge-safe: NO importa Prisma ni bcrypt, para poder
 * usarse en el proxy/middleware (runtime edge). Los providers (Credentials con
 * acceso a BD) se añaden en src/auth.ts (runtime Node).
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 días, renovación deslizante
  },
  providers: [],
  callbacks: {
    // Propaga rol/escuela al token JWT.
    jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.escuelaId = user.escuelaId;
      }
      return token;
    },
    // Expone rol/escuela en la sesión para la UI y el proxy.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.rol = token.rol as Rol;
        session.user.escuelaId = (token.escuelaId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
