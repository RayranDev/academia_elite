import { requireAuthContext } from "@/lib/auth/session";
import { listarConversaciones } from "@/services/mensaje.service";
import { obtenerMisJugadores, obtenerEstadoBloqueo } from "@/services/cuenta.service";
import { mensajeDeBloqueo } from "@/lib/bloqueo";
import { ThreadList } from "@/components/messages/ThreadList";
import { NuevaConversacionDialog } from "@/components/messages/NuevaConversacionDialog";
import { AvisoAccesoLimitado } from "@/components/messages/AvisoAccesoLimitado";

export default async function JugadorMensajesPage() {
  // permitirBloqueado: mensajes es la única página de /jugador accesible
  // para una familia bloqueada por mora (ver layout.tsx).
  const ctx = await requireAuthContext({ permitirBloqueado: true });
  const [conversaciones, hijos, estado] = await Promise.all([
    listarConversaciones(ctx),
    obtenerMisJugadores(ctx),
    obtenerEstadoBloqueo(ctx.userId),
  ]);
  const avisoBloqueo =
    estado?.bloqueado && estado.rol === "JUGADOR"
      ? mensajeDeBloqueo(estado.bloqueoTipo, estado.bloqueoMensaje)
      : null;

  return (
    <div className="max-w-2xl space-y-3">
      {avisoBloqueo && <AvisoAccesoLimitado mensaje={avisoBloqueo} />}
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
