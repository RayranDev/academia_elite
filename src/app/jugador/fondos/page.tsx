import { requireAuthContext } from "@/lib/auth/session";
import { listarFondosJugador } from "@/services/fondo.service";
import { DomainError } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { FondosGaleria } from "@/components/jugador/FondosGaleria";

export default async function FondosPage() {
  const ctx = await requireAuthContext();
  let datos;
  try {
    datos = await listarFondosJugador(ctx);
  } catch (e) {
    if (e instanceof DomainError) {
      return (
        <Card>
          <p className="text-muted">Aún no hay un jugador vinculado a tu cuenta.</p>
        </Card>
      );
    }
    throw e;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-display italic uppercase">Fondos de carta</h1>
        <p className="text-sm text-muted">
          Desbloquea fondos con tus méritos (logros, nivel de carta y progreso
          personal) y equipa el que más te guste. Se ve detrás de tu jugador en
          la carta.
        </p>
      </div>
      <FondosGaleria jugadorId={datos.jugadorId} fondos={datos.fondos} />
    </div>
  );
}
