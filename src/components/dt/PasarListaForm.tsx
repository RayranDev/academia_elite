"use client";

import { useActionState, useState, startTransition, type FormEvent } from "react";
import { pasarListaAction } from "@/actions/evento.actions";
import type { ActionResult } from "@/lib/action-result";
import {
  mensajeAsistenciaGuardada,
  textoContadorAsistencia,
  type ResultadoAsistencia,
} from "@/lib/eventos/asistencia";
import { Button } from "@/components/ui/Button";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { cn } from "@/lib/cn";

interface ConvocadoLista {
  jugadorId: string;
  nombre: string;
  apellido: string;
  /** null = todavía no se pasó lista a este jugador. */
  presente: boolean | null;
}

function iguales(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

/**
 * Lista de asistencia del detalle del evento. Antes era un `<form>` plano que
 * recargaba sin decir nada: el DT no sabía si se guardó. Ahora:
 *  - contador vivo "X de Y presentes" y "Marcar todos / Desmarcar todos";
 *  - botón deshabilitado con "Guardando…" mientras el servidor responde;
 *  - confirmación explícita ("Asistencia guardada: X presentes de Y.") o el
 *    error puntual, en una región viva pegada al botón;
 *  - aviso "Hay cambios sin guardar" si toca algo después de guardar.
 *
 * Los checkbox son CONTROLADOS y el envío es `onSubmit` + `startTransition` en
 * vez de `<form action>`: React 19 reinicia el DOM de un `<form action>` al
 * terminar la acción, y eso desmarcaba visualmente todos los checkbox mientras
 * el estado (y el contador) seguía diciendo "4 de 5". Con este envío el DOM y
 * el estado nunca se desincronizan, con éxito o con error.
 */
export function PasarListaForm({
  eventoId,
  convocados,
}: {
  eventoId: string;
  convocados: ConvocadoLista[];
}) {
  const [state, action, pending] = useActionState<
    ActionResult<ResultadoAsistencia> | undefined,
    FormData
  >(pasarListaAction, undefined);

  const [presentes, setPresentes] = useState<Set<string>>(
    () => new Set(convocados.filter((c) => c.presente === true).map((c) => c.jugadorId)),
  );
  // Lo último que quedó en el servidor: sirve para avisar de cambios sin guardar.
  const [guardado, setGuardado] = useState<Set<string>>(presentes);
  const [ultimoEstado, setUltimoEstado] = useState(state);
  // El mensaje corresponde al último envío; si el DT vuelve a tocar la lista deja
  // de describirla, así que se oculta hasta el próximo guardado.
  const [editado, setEditado] = useState(false);

  // "Ajuste de estado al cambiar un valor" (patrón documentado de React): cuando
  // llega un resultado nuevo se toma la foto de lo guardado, sin useEffect.
  if (state !== ultimoEstado) {
    setUltimoEstado(state);
    setEditado(false);
    if (state?.ok) setGuardado(new Set(presentes));
  }

  const total = convocados.length;
  const marcados = presentes.size;
  const sinGuardar = !iguales(presentes, guardado);
  const yaSeGuardoAlguna = convocados.some((c) => c.presente !== null) || state?.ok === true;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  function alternar(jugadorId: string, marcar: boolean) {
    setEditado(true);
    setPresentes((prev) => {
      const siguiente = new Set(prev);
      if (marcar) siguiente.add(jugadorId);
      else siguiente.delete(jugadorId);
      return siguiente;
    });
  }

  function marcarTodos(marcar: boolean) {
    setEditado(true);
    setPresentes(marcar ? new Set(convocados.map((c) => c.jugadorId)) : new Set());
  }

  const exito = !editado && state?.ok && state.data ? mensajeAsistenciaGuardada(state.data) : null;
  const error = !editado && state && !state.ok ? state.error : null;

  return (
    <form onSubmit={enviar} className="space-y-3">
      <input type="hidden" name="eventoId" value={eventoId} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-[10rem] flex-1">
          <p className="text-sm font-semibold tabular">
            {textoContadorAsistencia(marcados, total)}
          </p>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Presentes"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={marcados}
          >
            <div
              className="h-full rounded-full bg-pitch transition-[width]"
              style={{ width: total === 0 ? "0%" : `${(marcados / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => marcarTodos(true)}
            disabled={pending || marcados === total}
          >
            Marcar todos
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => marcarTodos(false)}
            disabled={pending || marcados === 0}
          >
            Desmarcar todos
          </Button>
        </div>
      </div>

      {!yaSeGuardoAlguna && (
        <p className="text-xs text-muted">Aún no se pasó lista en este evento.</p>
      )}

      <fieldset disabled={pending} className="space-y-1.5 border-0 p-0">
        <legend className="sr-only">Asistencia de los convocados</legend>
        {convocados.map((c) => {
          const marcado = presentes.has(c.jugadorId);
          return (
            <label
              key={c.jugadorId}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                marcado
                  ? "border-pitch/40 bg-pitch/10"
                  : "border-subtle bg-surface-2/50 hover:bg-surface-2",
              )}
            >
              <input type="hidden" name="jugadores" value={c.jugadorId} />
              <input
                type="checkbox"
                name={`presente_${c.jugadorId}`}
                checked={marcado}
                onChange={(e) => alternar(c.jugadorId, e.target.checked)}
                className="h-4 w-4 accent-[color:var(--brand)]"
              />
              <span className="flex-1">
                {c.nombre} {c.apellido}
              </span>
              <span className="text-xs text-muted">{marcado ? "Presente" : "Ausente"}</span>
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar asistencia"}
        </Button>
        {sinGuardar && !pending && (
          <span className="text-xs font-semibold text-oro">Hay cambios sin guardar.</span>
        )}
      </div>
      <MensajeAccion exito={exito} error={error} />
    </form>
  );
}
