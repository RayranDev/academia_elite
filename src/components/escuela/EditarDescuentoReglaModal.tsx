"use client";

import { useActionState } from "react";
import { editarDescuentoReglaAction } from "@/actions/descuento.actions";
import { TIPOS_DESCUENTO, etiquetaTipoDescuento } from "@/lib/validators/descuento";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";
import type { DescuentoReglaDTO } from "@/services/descuento.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Editar una regla ya cargada. El `DescuentoReglaDTO` de la fila ya trae todo,
 * no hace falta un fetch on-demand para abrir el modal (mismo criterio que
 * EditarArancelModal).
 */
export function EditarDescuentoReglaModal({
  regla,
  categorias,
  onClose,
}: {
  regla: DescuentoReglaDTO;
  categorias: { id: string; nombre: string }[];
  onClose: (cambio: boolean) => void;
}) {
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(async (_prev, fd) => {
    const res = await editarDescuentoReglaAction(undefined, fd);
    if (res.ok) onClose(true);
    return res;
  }, undefined);

  return (
    <Modal open onClose={() => onClose(false)} title="Editar regla de descuento">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={regla.id} />
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="categoriaId-editar">
            Categoría
          </label>
          <select
            id="categoriaId-editar"
            name="categoriaId"
            defaultValue={regla.categoriaId}
            required
            className={input}
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="nombre-editar">
            Nombre
          </label>
          <input
            id="nombre-editar"
            name="nombre"
            type="text"
            maxLength={60}
            required
            defaultValue={regla.nombre}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="tipo-editar">
            Tipo
          </label>
          <select
            id="tipo-editar"
            name="tipo"
            defaultValue={regla.tipo}
            className={input}
          >
            {TIPOS_DESCUENTO.map((t) => (
              <option key={t} value={t}>{etiquetaTipoDescuento(t)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="valor-editar">
            Valor
          </label>
          <input
            id="valor-editar"
            name="valor"
            type="number"
            min={0}
            step="any"
            required
            defaultValue={regla.valor}
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
