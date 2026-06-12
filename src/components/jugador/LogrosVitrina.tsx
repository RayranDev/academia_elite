import { Medal, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { InsigniaDTO, BonusDTO } from "@/services/player.service";

export function LogrosVitrina({
  insignias,
  bonus,
  bonusUltima,
}: {
  insignias: InsigniaDTO[];
  bonus: BonusDTO[];
  bonusUltima: number;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 text-lg font-bold">Vitrina de insignias</h2>
        <p className="mb-4 text-sm text-muted">
          {insignias.filter((i) => i.obtenido).length} de {insignias.length}{" "}
          conseguidas.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {insignias.map((i) => (
            <div
              key={i.codigo}
              className={`rounded-xl border p-4 text-center ${
                i.obtenido
                  ? "border-brand/50 bg-surface-2"
                  : "border-subtle bg-surface opacity-50"
              }`}
              title={i.descripcion}
            >
              <div className="flex justify-center">
                {i.obtenido ? (
                  <Medal className="h-8 w-8 text-oro" aria-hidden />
                ) : (
                  <Lock className="h-8 w-8 text-muted" aria-hidden />
                )}
              </div>
              <p className="mt-2 text-sm font-bold">{i.nombre}</p>
              <p className="mt-1 text-[11px] text-muted">{i.descripcion}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold">Bonus de logros (anti-inflación)</h2>
        <p className="mb-4 text-sm text-muted">
          Los bonus se aplican en la <b>siguiente</b> evaluación, con un máximo
          acumulado. Tu carta actual incluye{" "}
          <span className="font-bold text-brand">+{bonusUltima}</span> ganados
          por logros.
        </p>
        {bonus.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tienes bonus.</p>
        ) : (
          <ul className="space-y-2">
            {bonus.map((b, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-b border-subtle pb-2 text-sm"
              >
                <span>
                  <span className="font-semibold">{b.nombre}</span>{" "}
                  <span className="text-muted">
                    (+{b.valor} {b.stat})
                  </span>
                </span>
                {b.consumido ? (
                  <Badge tono="pitch">Aplicado</Badge>
                ) : (
                  <Badge tono="oro">Pendiente</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
