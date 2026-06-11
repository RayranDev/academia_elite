import { requireAuthContext } from "@/lib/auth/session";
import { listarConversaciones } from "@/services/mensaje.service";
import { listarHijos } from "@/repositories/jugador.repository";
import { ThreadList } from "@/components/messages/ThreadList";
import { NuevaConversacionDialog } from "@/components/messages/NuevaConversacionDialog";

export default async function JugadorMensajesPage() {
  const ctx = await requireAuthContext();
  const [conversaciones, hijos] = await Promise.all([
    listarConversaciones(ctx),
    listarHijos(ctx.userId),
  ]);

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic uppercase">Mensajes</h1>
        <NuevaConversacionDialog
          basePath="/jugador/mensajes"
          jugadores={hijos.map((h) => ({
            id: h.id,
            label: `${h.nombre} ${h.apellido}`,
          }))}
        />
      </div>
      <p className="text-sm text-muted">
        Habla con el entrenador sobre tu hijo/a. Las noticias del club aparecen en
        tu página de inicio.
      </p>
      <ThreadList conversaciones={conversaciones} basePath="/jugador/mensajes" />
    </div>
  );
}
