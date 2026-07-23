"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cerrarSesionAction } from "@/actions/sesion.actions";
import { cargarEstadisticasAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import type {
  ConvocadoSesionDTO,
  EstadisticaSesionDTO,
} from "@/services/sesion.service";
import type { EstadoAsistencia } from "./useAsistenciaOptimista";

type Campo = "minutos" | "goles" | "asistencias" | "amarillas";

/**
 * Paso 3: resumen + nota + un único botón que cierra (PLAN-UX-DT PR-3 §3.3).
 * La asistencia ya se guardó toque a toque; cerrar solo confirma el fin.
 *
 * En PARTIDO (PR-4 §4.2) suma la tabla por jugador EDITABLE con steppers: sirve
 * para corregir lo cargado en vivo o para el DT que prefiere cargar todo al
 * final. Reemplaza a la planilla de 7 columnas del detalle del evento. Al
 * confirmar, el cierre dispara la difusión del resultado (una sola vez).
 */
export function CierreSesion({
  eventoId,
  filas,
  estadoDe,
  notaInicial,
  esPartido,
}: {
  eventoId: string;
  filas: ConvocadoSesionDTO[];
  estadoDe: (c: ConvocadoSesionDTO) => EstadoAsistencia;
  notaInicial: string | null;
  esPartido: boolean;
}) {
  const router = useRouter();
  const [nota, setNota] = useState(notaInicial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [stats, setStats] = useState<Map<string, EstadisticaSesionDTO>>(
    () => new Map(filas.map((f) => [f.jugadorId, { ...f.estadistica }])),
  );

  const conteo = filas.reduce(
    (acc, c) => {
      acc[estadoDe(c)] += 1;
      if (c.llegoTarde) acc.tarde += 1;
      if (c.salioAntes) acc.retiros += 1;
      return acc;
    },
    { PRESENTE: 0, AUSENTE: 0, JUSTIFICADO: 0, tarde: 0, retiros: 0 },
  );

  function ajustar(jugadorId: string, campo: Campo, delta: number) {
    setStats((prev) => {
      const m = new Map(prev);
      const actual = m.get(jugadorId);
      if (!actual) return prev;
      m.set(jugadorId, {
        ...actual,
        [campo]: Math.max(0, actual[campo] + delta),
      });
      return m;
    });
  }

  function alternarRoja(jugadorId: string) {
    setStats((prev) => {
      const m = new Map(prev);
      const actual = m.get(jugadorId);
      if (!actual) return prev;
      m.set(jugadorId, { ...actual, roja: !actual.roja });
      return m;
    });
  }

  function cerrar() {
    setError(null);
    startTransition(async () => {
      try {
        // En partido se persiste la tabla revisada ANTES de cerrar: el cierre
        // difunde el resultado y ya debe reflejar lo corregido.
        if (esPartido) {
          const fd = new FormData();
          fd.set("eventoId", eventoId);
          for (const f of filas) {
            const s = stats.get(f.jugadorId);
            if (!s) continue;
            fd.append("jugadores", f.jugadorId);
            fd.set(`minutos_${f.jugadorId}`, String(s.minutos));
            fd.set(`goles_${f.jugadorId}`, String(s.goles));
            fd.set(`asistencias_${f.jugadorId}`, String(s.asistencias));
            fd.set(`amarillas_${f.jugadorId}`, String(s.amarillas));
            if (s.roja) fd.set(`roja_${f.jugadorId}`, "on");
          }
          await cargarEstadisticasAction(fd);
        }

        const res = await cerrarSesionAction({
          eventoId,
          notaSesion: nota.trim() || undefined,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(`/dt/eventos/${eventoId}`);
        router.refresh();
      } catch {
        setError("No se pudo guardar el cierre. Probá de nuevo.");
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

      {esPartido && (
        <div>
          <h2 className="text-lg font-bold">Estadísticas</h2>
          <p className="mb-2 text-xs text-muted">
            Revisá o corregí lo cargado en vivo.
          </p>
          <ul className="divide-y divide-subtle rounded-lg border border-subtle">
            {filas.map((f) => {
              const s = stats.get(f.jugadorId);
              if (!s) return null;
              return (
                <li key={f.jugadorId} className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {f.nombre} {f.apellido}
                    </span>
                    <button
                      type="button"
                      onClick={() => alternarRoja(f.jugadorId)}
                      aria-pressed={s.roja}
                      className={`min-h-11 rounded-lg px-3 text-xs font-bold ${
                        s.roja ? "bg-alerta/20 text-alerta" : "text-muted"
                      }`}
                    >
                      🟥 Roja
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        ["minutos", "Min"],
                        ["goles", "Goles"],
                        ["asistencias", "Asist"],
                        ["amarillas", "🟨"],
                      ] as [Campo, string][]
                    ).map(([campo, etiqueta]) => (
                      <Stepper
                        key={campo}
                        etiqueta={etiqueta}
                        valor={s[campo]}
                        onMenos={() =>
                          ajustar(f.jugadorId, campo, campo === "minutos" ? -5 : -1)
                        }
                        onMas={() =>
                          ajustar(f.jugadorId, campo, campo === "minutos" ? 5 : 1)
                        }
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

function Stepper({
  etiqueta,
  valor,
  onMenos,
  onMas,
}: {
  etiqueta: string;
  valor: number;
  onMenos: () => void;
  onMas: () => void;
}) {
  return (
    <div className="rounded-lg border border-subtle p-1 text-center">
      <p className="text-[10px] uppercase text-muted">{etiqueta}</p>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onMenos}
          aria-label={`Restar ${etiqueta}`}
          className="min-h-11 w-9 rounded text-lg font-bold text-muted"
        >
          −
        </button>
        <span className="tabular text-sm font-bold">{valor}</span>
        <button
          type="button"
          onClick={onMas}
          aria-label={`Sumar ${etiqueta}`}
          className="min-h-11 w-9 rounded text-lg font-bold text-brand"
        >
          +
        </button>
      </div>
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
