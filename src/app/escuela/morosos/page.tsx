import { requireAuthContext } from "@/lib/auth/session";
import { listarMorosos } from "@/services/gestion-jugadores.service";
import { MorososPanel } from "@/components/escuela/MorososPanel";

export default async function MorososPage() {
  const ctx = await requireAuthContext();
  const morosos = await listarMorosos(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Morosos</h1>
      <p className="text-sm text-muted">
        Jugadores activos con cuotas vencidas. Bloqueá el acceso de una o
        varias familias a la vez; cada bloqueo queda auditado por separado.
      </p>
      <MorososPanel morosos={morosos} />
    </div>
  );
}
