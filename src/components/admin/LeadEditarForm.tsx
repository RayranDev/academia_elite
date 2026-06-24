"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { actualizarLeadAction } from "@/actions/admin.actions";
import { Button } from "@/components/ui/Button";
import { LABEL_ESTADO_LEAD } from "@/components/admin/EstadoLeadBadge";
import { ESTADOS_LEAD } from "@/types";
import type { ActionResult } from "@/lib/action-result";
import type { LeadDetalleDTO } from "@/services/lead.service";

const campo =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-pitch";
const etiqueta = "mb-1 block text-xs text-muted";

/** Edita estado y seguimiento del lead (mini-CRM). */
export function LeadEditarForm({ lead }: { lead: LeadDetalleDTO }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(actualizarLeadAction, undefined);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="leadId" value={lead.id} />
      <div>
        <label htmlFor="le-estado" className={etiqueta}>
          Estado
        </label>
        <select
          id="le-estado"
          name="estado"
          defaultValue={lead.estado}
          className={campo}
        >
          {ESTADOS_LEAD.map((e) => (
            <option key={e} value={e}>
              {LABEL_ESTADO_LEAD[e]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="le-resp" className={etiqueta}>
          Responsable{" "}
          <span className="text-foreground/70">
            ({lead.responsableNombre ?? "sin asignar"})
          </span>
        </label>
        <select id="le-resp" name="responsable" defaultValue="mantener" className={campo}>
          <option value="mantener">Mantener</option>
          <option value="asignarme">Asignármelo</option>
          <option value="quitar">Quitar responsable</option>
        </select>
      </div>
      <div>
        <label htmlFor="le-prox" className={etiqueta}>
          Próxima acción
        </label>
        <input
          id="le-prox"
          name="proximaAccion"
          defaultValue={lead.proximaAccion ?? ""}
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="le-fecha" className={etiqueta}>
          Fecha del próximo contacto
        </label>
        <input
          id="le-fecha"
          name="fechaProximoContacto"
          type="date"
          defaultValue={lead.fechaProximoContacto?.slice(0, 10) ?? ""}
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="le-obs" className={etiqueta}>
          Observaciones
        </label>
        <textarea
          id="le-obs"
          name="observaciones"
          rows={3}
          defaultValue={lead.observaciones ?? ""}
          className={campo}
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-pitch">Cambios guardados.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
