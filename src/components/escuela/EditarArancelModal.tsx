"use client";

import { useActionState } from "react";
import { editarArancelAction } from "@/actions/arancel.actions";
import {
  CONCEPTOS_MEMBRESIA,
  etiquetaConcepto,
} from "@/lib/validators/membresia";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";
import type { ArancelDTO } from "@/services/arancel.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Editar un precio ya cargado. A diferencia de la ficha médica, esto no es un
 * dato sensible: el `ArancelDTO` de la fila ya trae todo, no hace falta un
 * fetch on-demand para abrir el modal.
 */
export function EditarArancelModal({
  arancel,
  categorias,
  onClose,
}: {
  arancel: ArancelDTO;
  categorias: { id: string; nombre: string }[];
  onClose: (cambio: boolean) => void;
}) {
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(async (_prev, fd) => {
    const res = await editarArancelAction(undefined, fd);
    if (res.ok) onClose(true);
    return res;
  }, undefined);

  return (
    <Modal open onClose={() => onClose(false)} title="Editar precio">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={arancel.id} />
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="categoriaId-editar">
            Categoría
          </label>
          <select
            id="categoriaId-editar"
            name="categoriaId"
            defaultValue={arancel.categoriaId ?? ""}
            className={input}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="concepto-editar">
            Concepto
          </label>
          <select
            id="concepto-editar"
            name="concepto"
            defaultValue={arancel.concepto}
            className={input}
          >
            {CONCEPTOS_MEMBRESIA.map((c) => (
              <option key={c} value={c}>{etiquetaConcepto(c)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="monto-editar">
            Monto
          </label>
          <input
            id="monto-editar"
            name="monto"
            type="number"
            min={0}
            step="any"
            required
            defaultValue={arancel.monto}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="vigenteDesde-editar">
            Rige desde
          </label>
          <input
            id="vigenteDesde-editar"
            name="vigenteDesde"
            type="date"
            defaultValue={arancel.vigenteDesde.slice(0, 10)}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="descripcion-editar">
            Descripción (opcional)
          </label>
          <textarea
            id="descripcion-editar"
            name="descripcion"
            rows={2}
            maxLength={200}
            defaultValue={arancel.descripcion ?? ""}
            className={input}
          />
        </div>
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
