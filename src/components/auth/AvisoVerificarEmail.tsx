import { getAuthContext } from "@/lib/auth/session";
import { emailVerificadoDe } from "@/services/recuperacion.service";
import { ReenviarVerificacionBtn } from "@/components/auth/ReenviarVerificacionBtn";

/**
 * Aviso suave (no bloquea el acceso): si el usuario logueado no verificó su
 * correo, le recordamos y le ofrecemos reenviar el enlace. Para no dejar
 * familias afuera, la cuenta funciona igual.
 */
export async function AvisoVerificarEmail() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  if (await emailVerificadoDe(ctx.userId)) return null;

  return (
    <div className="mb-4 flex flex-col gap-1 rounded-lg border border-info/40 bg-info/10 px-4 py-3 text-sm text-info sm:flex-row sm:items-center sm:justify-between">
      <span>
        Verificá tu correo para asegurar tu cuenta. Te enviamos un enlace al
        registrarte.
      </span>
      <ReenviarVerificacionBtn />
    </div>
  );
}
