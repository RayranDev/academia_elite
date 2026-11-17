import type { Rol } from "@/types";
import type { DefaultSession } from "next-auth";

// Augmentación de tipos de Auth.js para incluir rol y escuela.
declare module "next-auth" {
  interface User {
    rol: Rol;
    escuelaId: string | null;
    /** Huella de la contraseña vigente al iniciar sesión (ver `huella-password.ts`). */
    huellaPassword?: string;
  }

  interface Session {
    user: {
      id: string;
      rol: Rol;
      escuelaId: string | null;
      /** Huella de contraseña con la que se emitió la sesión (undefined = sesión previa a la revocación). */
      huellaPassword?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol: Rol;
    escuelaId: string | null;
    huellaPassword?: string;
  }
}
