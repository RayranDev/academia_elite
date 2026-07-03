import { requireAuthContext } from "@/lib/auth/session";
import { obtenerMiCuenta } from "@/services/cuenta.service";
import { DatosCuentaForm } from "@/components/cuenta/DatosCuentaForm";
import { CambiarPasswordForm } from "@/components/cuenta/CambiarPasswordForm";

export default async function CuentaPage() {
  const ctx = await requireAuthContext();
  const cuenta = await obtenerMiCuenta(ctx);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Mi cuenta</h1>
      <DatosCuentaForm
        nombre={cuenta.nombre}
        email={cuenta.email}
        emailVerificado={cuenta.emailVerificado}
      />
      <CambiarPasswordForm />
    </div>
  );
}
