import { getAuthContext } from "@/lib/auth/session";
import { emailVerificadoDe } from "@/services/recuperacion.service";
import { VerificarEmailInline } from "@/components/auth/VerificarEmailInline";

/**
 * Aviso suave (no bloquea el acceso): si el usuario logueado no verificó su
 * correo, le recordamos y le ofrecemos verificarlo con un código. Para no dejar
 * familias afuera, la cuenta funciona igual.
 */
export async function AvisoVerificarEmail() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  if (await emailVerificadoDe(ctx.userId)) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-info/40 bg-info/10 px-4 py-3 text-sm text-info">
      <span>
        Verificá tu correo para asegurar tu cuenta. Pedí un código y ingresalo
        acá.
      </span>
      <VerificarEmailInline />
    </div>
  );
}
