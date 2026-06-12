"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { PlantillaItemDTO } from "@/services/jugador.service";

type Filtro = string; // categoriaId | "TODAS" | "VENCIDAS"

export function PlantillaGrid({
  jugadores,
  categorias,
}: {
  jugadores: PlantillaItemDTO[];
  categorias: { id: string; nombre: string }[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("TODAS");

  const visibles = jugadores.filter((j) => {
    if (filtro === "TODAS") return true;
    if (filtro === "VENCIDAS") return j.vencida;
    return j.categoriaId === filtro;
  });

  const chips: { id: Filtro; label: string }[] = [
    { id: "TODAS", label: "Todas" },
    ...categorias.map((c) => ({ id: c.id, label: c.nombre })),
    { id: "VENCIDAS", label: "Vencidas" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              filtro === c.id
                ? "border-brand bg-brand/15 text-brand"
                : "border-subtle text-muted hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icon={Users}
          titulo="Sin jugadores"
          texto="No hay jugadores que coincidan con este filtro."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visibles.map((j) => (
            <Link
              key={j.id}
              href={`/dt/jugadores/${j.id}`}
              className="group flex flex-col items-center gap-2"
            >
              {j.card ? (
                <PlayerCard data={j.card} size="sm" />
              ) : (
                <div className="flex aspect-3/4 w-32 flex-col items-center justify-center rounded-[14px] border border-dashed border-subtle bg-surface-2 text-center text-xs text-muted">
                  <span className="px-2">
                    {j.nombre} {j.apellido}
                  </span>
                  <span className="mt-1 text-pitch">Sin evaluar</span>
                </div>
              )}
              <div className="text-center">
                <p className="text-xs font-semibold group-hover:text-brand">
                  {j.nombre} {j.apellido}
                </p>
                {j.vencida ? (
                  <Badge tono="alerta">Vencida</Badge>
                ) : (
                  <span className="text-[10px] text-muted">{j.categoriaNombre}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
