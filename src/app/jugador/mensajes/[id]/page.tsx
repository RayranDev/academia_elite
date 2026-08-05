import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerConversacionDetalle } from "@/services/mensaje.service";
import { obtenerEstadoBloqueo } from "@/services/cuenta.service";
import { mensajeDeBloqueo } from "@/lib/bloqueo";
import { DomainError } from "@/lib/errors";
import { ThreadView } from "@/components/messages/ThreadView";
import { AvisoAccesoLimitado } from "@/components/messages/AvisoAccesoLimitado";

export default async function JugadorThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // permitirBloqueado: mismo criterio que /jugador/mensajes (ver layout.tsx)
  // — un hilo abierto es parte del mismo acceso limitado.
  const ctx = await requireAuthContext({ permitirBloqueado: true });

  let conv;
  try {
    conv = await obtenerConversacionDetalle(ctx, id);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  const estado = await obtenerEstadoBloqueo(ctx.userId);
  const avisoBloqueo =
    estado?.bloqueado && estado.rol === "JUGADOR"
      ? mensajeDeBloqueo(estado.bloqueoTipo, estado.bloqueoMensaje)
      : null;

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/jugador/mensajes" className="text-sm text-muted hover:text-foreground">
        ← Volver a mensajes
      </Link>
      {avisoBloqueo && <AvisoAccesoLimitado mensaje={avisoBloqueo} />}
      <ThreadView conv={conv} />
    </div>
  );
}
