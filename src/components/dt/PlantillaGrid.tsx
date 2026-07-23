"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, Camera, CameraOff } from "lucide-react";
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
  const [q, setQ] = useState("");

  const visibles = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return jugadores.filter((j) => {
      if (filtro === "VENCIDAS" && !j.vencida) return false;
      if (filtro !== "TODAS" && filtro !== "VENCIDAS" && j.categoriaId !== filtro) {
        return false;
      }
      if (texto && !`${j.nombre} ${j.apellido}`.toLowerCase().includes(texto)) {
        return false;
      }
      return true;
    });
  }, [jugadores, filtro, q]);

  const chips: { id: Filtro; label: string }[] = [
    { id: "TODAS", label: "Todas" },
    ...categorias.map((c) => ({ id: c.id, label: c.nombre })),
    { id: "VENCIDAS", label: "Vencidas" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar jugador…"
            aria-label="Buscar jugador"
            className="rounded-lg border border-subtle bg-surface-2 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
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
              // Filtrando por vencidas, la carta entera lleva a evaluar: es la
              // acción obvia desde esa vista (PLAN-UX-DT PR-2 · B7). No se anida
              // un botón porque la carta ya es un enlace.
              href={
                filtro === "VENCIDAS"
                  ? `/dt/jugadores/${j.id}/evaluar`
                  : `/dt/jugadores/${j.id}`
              }
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
                {filtro === "VENCIDAS" ? (
                  <span className="inline-flex min-h-6 items-center rounded-full bg-brand/15 px-2 text-[10px] font-bold text-brand">
                    Evaluar →
                  </span>
                ) : j.vencida ? (
                  <Badge tono="alerta">Vencida</Badge>
                ) : (
                  <span className="text-[10px] text-muted">{j.categoriaNombre}</span>
                )}
                <ConsentimientoFoto tieneFoto={j.tieneFoto} consentimiento={j.consentimiento} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Estado del consentimiento de foto del responsable, para que el DT sepa de un
 * vistazo de quién puede ver/usar la foto. Con consentimiento la carta muestra
 * la foto real; sin él, el avatar.
 */
function ConsentimientoFoto({
  tieneFoto,
  consentimiento,
}: {
  tieneFoto: boolean;
  consentimiento: boolean;
}) {
  if (consentimiento) {
    return (
      <div
        className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] text-brand"
        title="Foto autorizada por el responsable"
      >
        <Camera className="h-3 w-3" aria-hidden /> Autorizada
      </div>
    );
  }
  return (
    <div
      className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] text-muted"
      title={
        tieneFoto
          ? "Hay foto cargada pero el responsable no autorizó mostrarla"
          : "El responsable no autorizó la foto"
      }
    >
      <CameraOff className="h-3 w-3" aria-hidden />{" "}
      {tieneFoto ? "Sin autorizar" : "No autorizada"}
    </div>
  );
}
