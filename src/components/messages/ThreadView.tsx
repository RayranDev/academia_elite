import { cn } from "@/lib/cn";
import { Composer } from "@/components/messages/Composer";
import type { ConversacionDetalleDTO } from "@/services/mensaje.service";

export function ThreadView({ conv }: { conv: ConversacionDetalleDTO }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black italic uppercase">{conv.asunto}</h1>
      <div className="space-y-3 rounded-xl border border-subtle bg-surface p-4">
        {conv.mensajes.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.esMio ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                m.esMio ? "bg-brand text-base" : "bg-surface-2 text-foreground",
              )}
            >
              {!m.esMio && (
                <p className="mb-1 text-xs font-bold opacity-70">
                  {m.remitenteNombre}
                </p>
              )}
              <p className="whitespace-pre-wrap">{m.cuerpo}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {new Date(m.createdAt).toLocaleString("es")}
              </p>
            </div>
          </div>
        ))}
      </div>
      <Composer conversacionId={conv.id} />
    </div>
  );
}
