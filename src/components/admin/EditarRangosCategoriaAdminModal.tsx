"use client";

import { useActionState } from "react";
import { fijarRangosCategoriaAction } from "@/actions/admin.actions";
import { CamposRangosFisicos } from "@/components/categoria/CamposRangosFisicos";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";
import type { RangosCategoriaDTO } from "@/services/categoria-rango.service";

/**
 * Edita la calibración física de UNA categoría de una escuela puntual
 * (SUPER_ADMIN, en sesión de soporte). Molde `EditarRangosCategoriaModal`
 * (self-service), pero llama la action que valida `EDITAR_PARAMETROS_GLOBALES`
 * + tenant de soporte en vez de `requireRole(ESCUELA_ADMIN)`.
 */
export function EditarRangosCategoriaAdminModal({
  escuelaId,
  rangos,
  onClose,
}: {
  escuelaId: string;
  rangos: RangosCategoriaDTO;
  onClose: (cambio: boolean) => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (_prev, fd) => {
      const res = await fijarRangosCategoriaAction(undefined, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title={`Rangos físicos · ${rangos.categoriaNombre}`}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="escuelaId" value={escuelaId} />
        <input type="hidden" name="categoriaId" value={rangos.categoriaId} />
        <p className="text-xs text-muted">
          La peor marca normaliza a 40 y la mejor a 99. Solo afecta a evaluaciones
          futuras de esta categoría. Queda auditado con el motivo de la sesión de
          soporte.
        </p>
        <CamposRangosFisicos defaultValues={rangos.pruebas} idPrefix="admin-" />
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
