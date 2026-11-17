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
    // Propaga rol/escuela y la huella de contraseña al token JWT. La huella la
    // calcula `authorize` (Node); acá solo se copia, para no traer crypto/Prisma.
    jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.escuelaId = user.escuelaId;
        token.huellaPassword = user.huellaPassword;
      }
      return token;
    },
    // Expone rol/escuela y la huella en la sesión para la UI, el proxy y
    // `getAuthContext` (que valida la huella contra la base).
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.rol = token.rol as Rol;
        session.user.escuelaId = (token.escuelaId as string | null) ?? null;
        session.user.huellaPassword = token.huellaPassword as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
