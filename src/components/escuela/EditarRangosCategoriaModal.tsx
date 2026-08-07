"use client";

import { useActionState } from "react";
import { editarRangosCategoriaAction } from "@/actions/categoria-rango.actions";
import { CamposRangosFisicos } from "@/components/categoria/CamposRangosFisicos";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";
import type { RangosCategoriaDTO } from "@/services/categoria-rango.service";

/**
 * Edita la calibración física (4 pruebas × min/max) de UNA categoría de la
 * escuela. Molde `EditarArancelModal.tsx`: el `RangosCategoriaDTO` de la fila
 * ya trae todo, no hace falta un fetch on-demand para abrir el modal.
 */
export function EditarRangosCategoriaModal({
  rangos,
  onClose,
}: {
  rangos: RangosCategoriaDTO;
  onClose: (cambio: boolean) => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (_prev, fd) => {
      const res = await editarRangosCategoriaAction(undefined, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title={`Rangos físicos · ${rangos.categoriaNombre}`}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="categoriaId" value={rangos.categoriaId} />
        <p className="text-xs text-muted">
          La peor marca normaliza a 40 y la mejor a 99. Solo afecta a evaluaciones
          futuras de esta categoría.
        </p>
        <CamposRangosFisicos defaultValues={rangos.pruebas} idPrefix="escuela-" />
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">{state.error}</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
