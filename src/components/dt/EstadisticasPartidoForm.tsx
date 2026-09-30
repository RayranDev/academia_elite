"use client";

import { guardarEstadisticasAction } from "@/actions/evento.actions";
import { Button } from "@/components/ui/Button";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";
import type { EstadisticaJugadorDTO } from "@/services/evento.service";

const numInput =
  "w-16 rounded-lg border border-subtle bg-surface-2 px-2 py-1.5 text-sm tabular outline-none focus:border-brand";

interface FilaEstadistica {
  jugadorId: string;
  nombre: string;
  apellido: string;
  estadistica: EstadisticaJugadorDTO | null;
}

/**
 * Tabla de estadística individual del partido (detalle del evento). Se envía
 * sin reiniciar los campos: si el servidor rechaza algo, el DT no pierde lo que
 * cargó de los demás jugadores, solo ve el error puntual.
 */
export function EstadisticasPartidoForm({
  eventoId,
  convocados,
}: {
  eventoId: string;
  convocados: FilaEstadistica[];
}) {
  const { enviar, pendiente, resultado, error, limpiar } = useEnvioAccion(
    guardarEstadisticasAction,
  );

  return (
    <form onSubmit={enviar} onChange={limpiar} className="space-y-3">
      <input type="hidden" name="eventoId" value={eventoId} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="py-1 pr-2">Jugador</th>
              <th className="px-1 text-center">Titular</th>
              <th className="px-1 text-center">Goles</th>
              <th className="px-1 text-center">Asist.</th>
              <th className="px-1 text-center">Amar.</th>
              <th className="px-1 text-center">Roja</th>
              <th className="px-1 text-center">Azul</th>
            </tr>
          </thead>
          <tbody>
            {convocados.map((c) => {
              const s = c.estadistica;
              const nombre = `${c.nombre} ${c.apellido}`;
              return (
                <tr key={c.jugadorId} className="border-t border-subtle/50">
                  <td className="py-2 pr-2">
                    <input type="hidden" name="jugadores" value={c.jugadorId} />
                    {nombre}
                  </td>
                  <td className="px-1 text-center">
                    <input
                      type="checkbox"
                      name={`titular_${c.jugadorId}`}
                      defaultChecked={s?.titular ?? false}
                      aria-label={`Titular ${nombre}`}
                      className="accent-[color:var(--brand)]"
                    />
                  </td>
                  <td className="px-1">
                    <input
                      name={`goles_${c.jugadorId}`}
                      type="number"
                      min={0}
                      max={99}
                      defaultValue={s?.goles ?? 0}
                      aria-label={`Goles ${nombre}`}
                      className={numInput}
                    />
                  </td>
                  <td className="px-1">
                    <input
                      name={`asistencias_${c.jugadorId}`}
                      type="number"
                      min={0}
                      max={99}
                      defaultValue={s?.asistencias ?? 0}
                      aria-label={`Asistencias ${nombre}`}
                      className={numInput}
                    />
                  </td>
                  <td className="px-1">
                    <input
                      name={`amarillas_${c.jugadorId}`}
                      type="number"
                      min={0}
                      max={2}
                      defaultValue={s?.amarillas ?? 0}
                      aria-label={`Amarillas ${nombre}`}
                      className={numInput}
                    />
                  </td>
                  <td className="px-1 text-center">
                    <input
                      type="checkbox"
                      name={`roja_${c.jugadorId}`}
                      defaultChecked={s?.roja ?? false}
                      aria-label={`Roja ${nombre}`}
                      className="accent-[color:var(--brand)]"
                    />
                  </td>
                  <td className="px-1 text-center">
                    <input
                      type="checkbox"
                      name={`azul_${c.jugadorId}`}
                      defaultChecked={s?.azul ?? false}
                      aria-label={`Azul ${nombre}`}
                      className="accent-[color:var(--brand)]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button type="submit" size="sm" disabled={pendiente} aria-busy={pendiente}>
        {pendiente ? "Guardando…" : "Guardar estadística"}
      </Button>
      <MensajeAccion
        exito={resultado?.ok ? "Estadística guardada." : null}
        error={error}
      />
    </form>
  );
}
