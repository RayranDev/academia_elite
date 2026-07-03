import { requireAuthContext } from "@/lib/auth/session";
import { obtenerMiCuenta, obtenerMisJugadores } from "@/services/cuenta.service";
import { DatosCuentaForm } from "@/components/cuenta/DatosCuentaForm";
import { MisJugadoresForm } from "@/components/cuenta/MisJugadoresForm";
import { CambiarPasswordForm } from "@/components/cuenta/CambiarPasswordForm";

export default async function CuentaPage() {
  const ctx = await requireAuthContext();
  const [cuenta, jugadores] = await Promise.all([
    obtenerMiCuenta(ctx),
    obtenerMisJugadores(ctx),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Mi cuenta</h1>
      <DatosCuentaForm
        nombre={cuenta.nombre}
        email={cuenta.email}
        emailVerificado={cuenta.emailVerificado}
      />
      <MisJugadoresForm jugadores={jugadores} />
      <CambiarPasswordForm />
    </div>
  );
}
