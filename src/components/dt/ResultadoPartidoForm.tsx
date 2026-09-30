"use client";

import { useId } from "react";
import { cargarResultadoAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";

const inputNumero =
  "w-20 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm tabular outline-none focus:border-brand";

/**
 * Resultado del partido en el detalle del evento. Al guardar se publica la
 * noticia del club y se notifica a las familias (ver `cargarResultadoDt`), así
 * que el formulario lo dice: confirma el marcador guardado y, si ya había uno,
 * avisa que volver a guardar vuelve a avisar.
 */
export function ResultadoPartidoForm({
  eventoId,
  resultadoLocal,
  resultadoVisitante,
}: {
  eventoId: string;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
}) {
  const idLocal = useId();
  const idVisitante = useId();
  const { enviar, pendiente, resultado, error, limpiar } =
    useEnvioAccion(cargarResultadoAction);

  const yaCargado = resultadoLocal !== null;
  const exito =
    resultado?.ok && resultado.data
      ? `Resultado guardado: ${resultado.data.local} - ${resultado.data.visitante}. Se publicó la noticia y se avisó a las familias.`
      : null;

  return (
    <form onSubmit={enviar} onChange={limpiar} className="space-y-3">
      <input type="hidden" name="eventoId" value={eventoId} />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={idLocal} className="mb-1 block text-xs text-muted">
            Local
          </label>
          <input
            id={idLocal}
            name="resultadoLocal"
            type="number"
            min={0}
            max={99}
            defaultValue={resultadoLocal ?? 0}
            className={inputNumero}
          />
        </div>
        <div>
          <label htmlFor={idVisitante} className="mb-1 block text-xs text-muted">
            Visitante
          </label>
          <input
            id={idVisitante}
            name="resultadoVisitante"
            type="number"
            min={0}
            max={99}
            defaultValue={resultadoVisitante ?? 0}
            className={inputNumero}
          />
        </div>
        <Button type="submit" disabled={pendiente} aria-busy={pendiente}>
          {pendiente
            ? "Guardando…"
            : yaCargado
              ? "Actualizar resultado"
              : "Cargar resultado"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        {yaCargado
          ? "Al actualizar el resultado se publica una nueva noticia y se vuelve a avisar a las familias."
          : "Al cargar el resultado se genera una noticia del club y se notifica a las familias."}
      </p>
      <MensajeAccion exito={exito} error={error} />
    </form>
  );
}
