"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { NoticiaDTO } from "@/services/player.service";

export function NoticiasList({ noticias }: { noticias: NoticiaDTO[] }) {
  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 10;
  const totalPaginas = Math.ceil(noticias.length / itemsPorPagina);

  if (noticias.length === 0) {
    return <p className="text-sm text-muted">Sin noticias por ahora.</p>;
  }

  const inicioIdx = (pagina - 1) * itemsPorPagina;
  const visible = noticias.slice(inicioIdx, inicioIdx + itemsPorPagina);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {visible.map((n) => (
          <li key={n.id} className="flex gap-3 border-b border-subtle pb-3 last:border-0 last:pb-0">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{n.titulo}</p>
              <p className="text-sm text-muted">{n.cuerpo}</p>
              <p className="text-[11px] text-muted">
                {new Date(n.fecha).toLocaleDateString("es")}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-subtle pt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
