"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { POSICIONES, STATS_CARTA } from "@/types";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Alta de logro (catálogo global del admin o propio de la escuela del DT). */
export function LogroFormModal({
  action,
  titulo,
  onClose,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  titulo: string;
  onClose: (cambio: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await action(prev, fd);
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title={titulo}>
      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Código (único)</label>
            <input name="codigo" required placeholder="MURO_DEFENSIVO" className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Posición</label>
            <select name="posicion" defaultValue="" className={input}>
              <option value="">General (todas)</option>
              {POSICIONES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Nombre</label>
          <input name="nombre" required className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Descripción</label>
          <textarea name="descripcion" rows={2} required className={input} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Tipo</label>
            <select name="tipo" defaultValue="INSIGNIA" className={input}>
              <option value="INSIGNIA">Insignia</option>
              <option value="BONUS">Bonus</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Stat (BONUS)</label>
            <select name="statBonus" defaultValue="" className={input}>
              <option value="">—</option>
              {[...STATS_CARTA, "MEN"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Valor (BONUS)</label>
            <input name="valorBonus" type="number" min={1} max={3} className={input} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="repetible" className="accent-[color:var(--brand)]" />
          Repetible (se puede ganar varias veces)
        </label>
        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">{state.error}</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Creando…" : "Crear logro"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
