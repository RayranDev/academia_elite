import { requireAuthContext } from "@/lib/auth/session";
import { obtenerHub, type HubDTO } from "@/services/player.service";
import { DomainError } from "@/lib/errors";
import { LogrosVitrina } from "@/components/jugador/LogrosVitrina";
import { Card } from "@/components/ui/Card";

async function cargarHub(): Promise<HubDTO | null> {
  const ctx = await requireAuthContext();
  try {
    return await obtenerHub(ctx);
  } catch (e) {
    if (e instanceof DomainError) return null;
    throw e;
  }
}

export default async function LogrosPage() {
  const hub = await cargarHub();
  if (!hub) {
    return (
      <Card>
        <p className="text-muted">Aún no hay un jugador vinculado a tu cuenta.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Logros</h1>
      <LogrosVitrina
        insignias={hub.insignias}
        bonus={hub.bonus}
        bonusUltima={hub.bonusUltima}
      />
    </div>
  );
}
