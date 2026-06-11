import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ObjetivoDTO } from "@/services/player.service";

const TONO: Record<string, "pitch" | "oro" | "neutral"> = {
  ACTIVO: "oro",
  CUMPLIDO: "pitch",
  VENCIDO: "neutral",
};

export function ObjetivosList({ objetivos }: { objetivos: ObjetivoDTO[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">Objetivos de desarrollo</h2>
      {objetivos.length === 0 ? (
        <p className="text-sm text-muted">
          Tu entrenador aún no fijó objetivos. ¡Pronto llegarán!
        </p>
      ) : (
        <ul className="space-y-4">
          {objetivos.map((o) => (
            <li key={o.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold">
                  {o.stat} → {o.valorMeta}
                </span>
                <Badge tono={TONO[o.estado] ?? "neutral"}>{o.estado}</Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${o.progreso}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted">
                <span>
                  Actual: {o.valorActual} ({o.progreso}%)
                </span>
                <span>
                  Límite: {new Date(o.fechaLimite).toLocaleDateString("es")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
