"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EditarRangosCategoriaModal } from "@/components/escuela/EditarRangosCategoriaModal";
import type { CategoriaDTO } from "@/services/categoria.service";
import type { RangosCategoriaDTO } from "@/services/categoria-rango.service";

/**
 * Lista de categorías + acceso a su calibración física. Molde `ArancelesPanel`:
 * tabla/lista con un botón por fila que abre un modal de edición.
 */
export function CategoriasPanel({
  categorias,
  rangos,
}: {
  categorias: CategoriaDTO[];
  rangos: RangosCategoriaDTO[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<RangosCategoriaDTO | null>(null);
  const rangosPorCategoria = new Map(rangos.map((r) => [r.categoriaId, r]));

  return (
    <div className="space-y-3">
      {categorias.length === 0 ? (
        <Card>
          <p className="text-muted">
            Aún no hay categorías. Crea la primera con el formulario.
          </p>
        </Card>
      ) : (
        categorias.map((c) => {
          const rangosCategoria = rangosPorCategoria.get(c.id);
          return (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{c.nombre}</p>
                <p className="text-xs text-muted">
                  {c.anioDesde == null ? "Sin edad" : `Años ${c.anioDesde}–${c.anioHasta}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{c.jugadores} jugadores</Badge>
                {rangosCategoria && (
                  <button
                    type="button"
                    onClick={() => setEditando(rangosCategoria)}
                    className="text-xs font-semibold text-muted hover:text-brand"
                  >
                    Rangos físicos
                  </button>
                )}
              </div>
            </Card>
          );
        })
      )}

      {editando && (
        <EditarRangosCategoriaModal
          rangos={editando}
          onClose={(cambio) => {
            setEditando(null);
            if (cambio) router.refresh();
          }}
        />
      )}
    </div>
  );
}
