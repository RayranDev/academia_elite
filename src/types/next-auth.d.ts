import type { Rol } from "@/types";
import type { DefaultSession } from "next-auth";

// Augmentación de tipos de Auth.js para incluir rol y escuela.
declare module "next-auth" {
  interface User {
    rol: Rol;
    escuelaId: string | null;
  }

  interface Session {
    user: {
      id: string;
      rol: Rol;
      escuelaId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol: Rol;
    escuelaId: string | null;
  }
}
