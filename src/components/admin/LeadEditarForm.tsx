"use client";

import { useActionState, useEffect, useState } from "react";
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

/** Fecha de hoy en formato YYYY-MM-DD, en la zona local del navegador. */
function hoyLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * "Hoy" solo se conoce en el cliente y recién tras montar: calcularlo en el
 * cuerpo del render lo correría también en el SSR de este client component,
 * con la hora UTC del server en vez de la del usuario (AGENTS.md §6, mismo
 * criterio que `AjustarFechaEventoModal`/`ModoSesion`). Un `min` distinto
 * entre server y cliente es un hydration mismatch que remonta el árbol.
 */
function useHoyLocal(): string | undefined {
  const [hoy, setHoy] = useState<string | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoy(hoyLocal());
  }, []);
  return hoy;
}

/** Edita estado y seguimiento del lead (mini-CRM). */
export function LeadEditarForm({ lead }: { lead: LeadDetalleDTO }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(actualizarLeadAction, undefined);
  // `defaultValue` solo aplica al montar: si `lead.estado` cambia por un
  // revalidate ajeno a este form (ej. al convertir el lead en escuela), el
  // <select> quedaba mostrando el valor viejo sin resincronizar. Estado
  // controlado + resync ajustado EN el render (no en un efecto — evita un
  // pass de render extra), patrón "adjust state during render" de React.
  const hoy = useHoyLocal();
  const [estado, setEstado] = useState(lead.estado);
  const [estadoSincronizado, setEstadoSincronizado] = useState(lead.estado);
  if (lead.estado !== estadoSincronizado) {
    setEstadoSincronizado(lead.estado);
    setEstado(lead.estado);
  }

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
          value={estado}
          onChange={(e) => setEstado(e.target.value as typeof lead.estado)}
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
          // No tiene sentido agendar el próximo contacto en el pasado: el `min`
          // es HOY (en la zona local del navegador).
          min={hoy}
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
