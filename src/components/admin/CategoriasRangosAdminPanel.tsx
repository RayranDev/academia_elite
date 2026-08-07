"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditarRangosCategoriaAdminModal } from "@/components/admin/EditarRangosCategoriaAdminModal";
import type { RangosCategoriaDTO } from "@/services/categoria-rango.service";

/**
 * Lista de categorías de la escuela (modo soporte) con acceso a su
 * calibración física. Necesita estado de cliente (qué categoría se está
 * editando) para abrir el modal — mismo motivo que `CategoriasPanel` en el
 * self-service de la escuela.
 */
export function CategoriasRangosAdminPanel({
  escuelaId,
  rangos,
}: {
  escuelaId: string;
  rangos: RangosCategoriaDTO[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<RangosCategoriaDTO | null>(null);

  if (rangos.length === 0) {
    return <p className="text-sm text-muted">Esta escuela todavía no tiene categorías.</p>;
  }

  return (
    <div className="space-y-3">
      {rangos.map((r) => (
        <div
          key={r.categoriaId}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3 first:border-t-0 first:pt-0"
        >
          <p className="text-sm font-semibold">{r.categoriaNombre}</p>
          <button
            type="button"
            onClick={() => setEditando(r)}
            className="text-xs font-semibold text-muted hover:text-brand"
          >
            Editar rangos
          </button>
        </div>
      ))}

      {editando && (
        <EditarRangosCategoriaAdminModal
          escuelaId={escuelaId}
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
