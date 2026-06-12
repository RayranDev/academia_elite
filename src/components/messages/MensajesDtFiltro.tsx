"use client";

import { useState } from "react";
import { ThreadList } from "@/components/messages/ThreadList";
import { cn } from "@/lib/cn";
import type { ConversacionResumenDTO } from "@/services/mensaje.service";

export function MensajesDtFiltro({
  conversaciones,
  categorias,
}: {
  conversaciones: ConversacionResumenDTO[];
  categorias: { id: string; nombre: string }[];
}) {
  const [filtro, setFiltro] = useState<string>("TODAS");
  const visibles =
    filtro === "TODAS"
      ? conversaciones
      : conversaciones.filter((c) => c.categoriaId === filtro);

  const chips = [{ id: "TODAS", label: "Todas" }, ...categorias.map((c) => ({ id: c.id, label: c.nombre }))];

  return (
    <div className="space-y-3">
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
      <ThreadList conversaciones={visibles} basePath="/dt/mensajes" />
    </div>
  );
}
