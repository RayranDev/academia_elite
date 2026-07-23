"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cerrarSesionAction } from "@/actions/sesion.actions";
import { Button } from "@/components/ui/Button";
import type { ConvocadoSesionDTO } from "@/services/sesion.service";
import type { EstadoAsistencia } from "./useAsistenciaOptimista";

/**
 * Paso 3: resumen + nota + un único botón que cierra (PLAN-UX-DT PR-3 §3.3).
 * Nada se "envía" acá: la asistencia ya se guardó toque a toque. Cerrar solo
 * confirma el fin de la sesión (y en PARTIDO dispara la difusión del resultado).
 */
export function CierreSesion({
  eventoId,
  filas,
  estadoDe,
  notaInicial,
}: {
  eventoId: string;
  filas: ConvocadoSesionDTO[];
  estadoDe: (c: ConvocadoSesionDTO) => EstadoAsistencia;
  notaInicial: string | null;
}) {
  const router = useRouter();
  const [nota, setNota] = useState(notaInicial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const conteo = filas.reduce(
    (acc, c) => {
      acc[estadoDe(c)] += 1;
      if (c.llegoTarde) acc.tarde += 1;
      if (c.salioAntes) acc.retiros += 1;
      return acc;
    },
    { PRESENTE: 0, AUSENTE: 0, JUSTIFICADO: 0, tarde: 0, retiros: 0 },
  );

  function cerrar() {
    setError(null);
    startTransition(async () => {
      const res = await cerrarSesionAction({
        eventoId,
        notaSesion: nota.trim() || undefined,
      });
      if (res.ok) {
        router.push(`/dt/eventos/${eventoId}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Resumen</h2>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Dato etiqueta="Presentes" valor={conteo.PRESENTE} tono="text-pitch" />
          <Dato etiqueta="Ausentes" valor={conteo.AUSENTE} tono="text-alerta" />
          <Dato etiqueta="Justificados" valor={conteo.JUSTIFICADO} tono="text-info" />
        </dl>
        {(conteo.tarde > 0 || conteo.retiros > 0) && (
          <p className="mt-2 text-xs text-muted">
            {conteo.tarde > 0 && `${conteo.tarde} llegó/llegaron tarde. `}
            {conteo.retiros > 0 && `${conteo.retiros} se retiró/retiraron antes.`}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="nota" className="mb-1 block text-sm font-medium text-muted">
          Nota general (opcional)
        </label>
        <textarea
          id="nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="¿Cómo estuvo la sesión?"
          className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      {error && (
        <p className="text-sm text-alerta" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={cerrar}
      >
        {pending ? "Guardando…" : "Confirmar y guardar"}
      </Button>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string;
  valor: number;
  tono: string;
}) {
  return (
    <div className="rounded-lg border border-subtle p-3">
      <dd className={`text-2xl font-black tabular ${tono}`}>{valor}</dd>
      <dt className="text-xs text-muted">{etiqueta}</dt>
    </div>
  );
}
