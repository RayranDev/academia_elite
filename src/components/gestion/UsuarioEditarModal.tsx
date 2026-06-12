"use client";

import { useActionState } from "react";
import { editarUsuarioAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { UsuarioAdminDTO } from "@/services/admin-usuarios.service";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function UsuarioEditarModal({
  usuario,
  onClose,
}: {
  usuario: UsuarioAdminDTO;
  onClose: (cambio: boolean) => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await editarUsuarioAction(prev, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title="Editar usuario">
      <form action={action} className="space-y-3">
        <input type="hidden" name="userId" value={usuario.id} />
        <div>
          <label className="mb-1 block text-xs text-muted">Nombre</label>
          <input name="nombre" defaultValue={usuario.nombre} required className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Email</label>
          <input name="email" type="email" defaultValue={usuario.email} required className={input} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={usuario.activo}
            className="accent-[color:var(--brand)]"
          />
          Cuenta activa
        </label>
        <p className="text-xs text-muted">
          Rol: {usuario.rol}
          {usuario.escuelaNombre && <> · {usuario.escuelaNombre}</>}
        </p>
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
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
