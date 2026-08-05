import { ShieldAlert } from "lucide-react";

/**
 * Banner para una familia bloqueada que igual puede ver mensajes (acceso
 * limitado, ver AGENTS.md/PENDIENTES). Mismo tono que /bloqueado, pero como
 * aviso fijo arriba del contenido en vez de pantalla completa.
 */
export function AvisoAccesoLimitado({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-alerta/40 bg-alerta/10 p-3 text-sm">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-alerta" aria-hidden />
      <p>
        {mensaje} Mientras tanto, podés seguir escribiéndole al entrenador
        acá.
      </p>
    </div>
  );
}
