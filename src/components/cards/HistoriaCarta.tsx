import { PlayerCard } from "@/components/cards/PlayerCard";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { HistoriaCartaItemDTO } from "@/lib/mappers/historia-carta";
import type { Nivel } from "@/types";

const ETIQUETA_NIVEL: Record<Nivel, string> = {
  BRONCE: "Bronce",
  PLATA: "Plata",
  ORO: "Oro",
  HEROE: "Héroe",
};

/**
 * Tira horizontal de mini-cartas, una por evaluación (más vieja → más
 * nueva), con scroll horizontal y snap en mobile — sin desbordar la página.
 * Reusa `PlayerCard` en tamaño "sm" (sin tilt/foil, ya liviana) en vez de
 * duplicar los materiales por nivel en un componente aparte.
 */
export function HistoriaCarta({ historia }: { historia: HistoriaCartaItemDTO[] }) {
  if (historia.length === 0) {
    return (
      <p className="text-sm text-muted">
        Todavía no hay evaluaciones para mostrar la historia de la carta.
      </p>
    );
  }

  if (historia.length === 1) {
    const [unica] = historia;
    return (
      <div className="flex flex-wrap items-center gap-4">
        <PlayerCard data={unica.card} size="sm" />
        <p className="max-w-xs text-sm text-muted">
          Esta es la primera evaluación — a partir de la próxima vas a ver acá
          cómo evoluciona la carta.
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
      {historia.map((item, i) => (
        <div
          key={i}
          className="flex shrink-0 snap-start flex-col items-center gap-2"
        >
          <PlayerCard data={item.card} size="sm" />
          <div className="flex flex-col items-center gap-1 text-center text-xs">
            <span className="text-muted">
              <FechaLocal iso={item.fecha} />
            </span>
            <span className="flex items-center gap-1">
              <span className="font-black tabular">OVR {item.ovr}</span>
              {item.delta !== null && (
                <span
                  className={cn(
                    "font-bold tabular",
                    item.delta > 0 && "text-pitch",
                    item.delta < 0 && "text-alerta",
                    item.delta === 0 && "text-muted",
                  )}
                >
                  ({item.delta > 0 ? `+${item.delta}` : item.delta})
                </span>
              )}
            </span>
            {item.subioNivel && (
              <Badge tono="pitch">¡Subió a {ETIQUETA_NIVEL[item.nivel]}!</Badge>
            )}
            {item.bajoNivel && (
              <Badge tono="alerta">Bajó a {ETIQUETA_NIVEL[item.nivel]}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
