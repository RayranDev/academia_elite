"use client";

import { useActionState } from "react";
import { editarStaffAction } from "@/actions/staff.actions";
import { CARGOS_STAFF, etiquetaCargoStaff } from "@/lib/validators/staff";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";
import type { StaffDTO } from "@/services/staff.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Editar un integrante ya cargado. El `StaffDTO` de la fila ya trae todo, no
 * hace falta un fetch on-demand para abrir el modal (mismo criterio que
 * EditarDescuentoReglaModal).
 */
export function EditarStaffModal({
  staff,
  onClose,
}: {
  staff: StaffDTO;
  onClose: (cambio: boolean) => void;
}) {
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(async (_prev, fd) => {
    const res = await editarStaffAction(undefined, fd);
    if (res.ok) onClose(true);
    return res;
  }, undefined);

  return (
    <Modal open onClose={() => onClose(false)} title="Editar staff">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={staff.id} />
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="cargo-editar">
            Cargo
          </label>
          <select
            id="cargo-editar"
            name="cargo"
            defaultValue={staff.cargo}
            className={input}
          >
            {CARGOS_STAFF.map((c) => (
              <option key={c} value={c}>{etiquetaCargoStaff(c)}</option>
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
            maxLength={80}
            required
            defaultValue={staff.nombre}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="telefono-editar">
            Teléfono
          </label>
          <input
            id="telefono-editar"
            name="telefono"
            type="text"
            maxLength={30}
            defaultValue={staff.telefono ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted" htmlFor="email-editar">
            Email
          </label>
          <input
            id="email-editar"
            name="email"
            type="email"
            defaultValue={staff.email ?? ""}
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
