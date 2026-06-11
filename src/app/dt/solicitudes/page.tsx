import { requireAuthContext } from "@/lib/auth/session";
import { listarSolicitudesDt } from "@/services/jugador.service";
import {
  aprobarSolicitudAction,
  rechazarSolicitudAction,
} from "@/actions/dt.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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

      {solicitudes.length === 0 ? (
        <Card>
          <p className="text-muted">No hay solicitudes pendientes.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold">
                  {s.nombre} {s.apellido}
                </p>
                <p className="text-xs text-muted">
                  {s.categoriaNombre} · Nac.{" "}
                  {new Date(s.fechaNacimiento).toLocaleDateString("es")}
                </p>
                {s.padreEmail && (
                  <p className="text-xs text-muted">
                    Tutor: {s.padreNombre} ({s.padreEmail})
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <form action={aprobarSolicitudAction}>
                  <input type="hidden" name="jugadorId" value={s.id} />
                  <Button type="submit" size="sm">
                    Aprobar
                  </Button>
                </form>
                <form action={rechazarSolicitudAction}>
                  <input type="hidden" name="jugadorId" value={s.id} />
                  <Button type="submit" size="sm" variant="danger">
                    Rechazar
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
