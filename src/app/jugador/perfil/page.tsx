import { requireAuthContext } from "@/lib/auth/session";
import { obtenerHub, type HubDTO } from "@/services/player.service";
import { DomainError } from "@/lib/errors";
import { FotoConsentimiento } from "@/components/jugador/FotoConsentimiento";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";
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

export default async function PerfilPage() {
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
      <h1 className="text-3xl font-display italic uppercase">Perfil</h1>
      <p className="text-sm text-muted">
        {hub.nombre} {hub.apellido} · {hub.categoriaNombre} · {hub.posicion}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <FotoConsentimiento
          jugadorId={hub.jugadorId}
          tieneFoto={hub.foto.tieneFoto}
          consentimiento={hub.foto.consentimiento}
          avatarConfig={hub.avatarConfig}
          seed={`${hub.nombre} ${hub.apellido}`}
        />
        <AvatarEditor
          jugadorId={hub.jugadorId}
          inicial={hub.avatarConfig}
          seed={`${hub.nombre} ${hub.apellido}`}
        />
      </div>
    </div>
  );
}
