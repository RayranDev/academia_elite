import { requireAuthContext } from "@/lib/auth/session";
import { listarSolicitudesDt } from "@/services/jugador.service";
import { SolicitudesLista } from "@/components/dt/SolicitudesLista";

export default async function SolicitudesPage() {
  const ctx = await requireAuthContext();
  const solicitudes = await listarSolicitudesDt(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Solicitudes</h1>
      <p className="text-sm text-muted">
        Familias que se registraron con un código de invitación. Al aprobar, el
        jugador pasa a ACTIVO y ya puedes evaluarlo.
      </p>

      <SolicitudesLista solicitudes={solicitudes} />
    </div>
  );
}
