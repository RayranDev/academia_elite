import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth/config";
import { loginSchema, otpLoginSchema } from "@/lib/validators/auth";
import { verifyPassword } from "@/lib/auth/password";
import { huellaDePassword } from "@/lib/auth/huella-password";
import {
  CANAL_OTP,
  CANAL_PASSWORD,
  exigirCupoDeLogin,
} from "@/lib/auth/limite-login";
import { verificarOtp } from "@/services/otp.service";
import { buscarCredencialesPorEmail } from "@/repositories/user.repository";
import type { Rol } from "@/types";

// En desarrollo, eliminamos las URLs estáticas si apuntan a localhost para que
// NextAuth detecte automáticamente el host real (ej. ngrok) gracias a trustHost: true.
if (process.env.NODE_ENV === "development") {
  if (process.env.AUTH_URL?.includes("localhost")) {
    delete process.env.AUTH_URL;
  }
  if (process.env.NEXTAUTH_URL?.includes("localhost")) {
    delete process.env.NEXTAUTH_URL;
  }
}

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
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        // Tope de intentos: acá y no en la action, porque el handler
        // /api/auth/callback/credentials llega a este mismo `authorize`.
        await exigirCupoDeLogin(request, CANAL_PASSWORD, email);
        const user = await buscarCredencialesPorEmail(email);
        if (!user || !user.activo) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol as Rol,
          escuelaId: user.escuelaId,
          huellaPassword: huellaDePassword(user.passwordHash),
        };
      },
    }),
    // Login con código de un solo uso (OTP) enviado por correo. La validación
    // del código vive en el servicio; acá solo mapeamos al usuario de sesión.
    Credentials({
      id: "otp",
      credentials: {
        email: { label: "Email", type: "email" },
        codigo: { label: "Código", type: "text" },
      },
      authorize: async (credentials, request) => {
        const parsed = otpLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await exigirCupoDeLogin(request, CANAL_OTP, parsed.data.email);
        const user = await verificarOtp(parsed.data.email, parsed.data.codigo);
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol as Rol,
          escuelaId: user.escuelaId,
          huellaPassword: user.huellaPassword,
        };
      },
    }),
  ],
});
