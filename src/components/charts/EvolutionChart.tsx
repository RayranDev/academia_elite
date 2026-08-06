"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { EvolucionPunto } from "@/services/hub-jugador.service";

const METRICAS = ["ovr", "rit", "tir", "pas", "reg", "def", "fis", "men"] as const;
type Metrica = (typeof METRICAS)[number];

export function EvolutionChart({
  datos,
  proyeccion,
}: {
  datos: EvolucionPunto[];
  /** Punto "hoy" de la línea punteada (solo se dibuja en la métrica OVR —
   * ver CURVA-DE-DESARROLLO.md §2/§7: los stats duros nunca se proyectan,
   * solo se mueven con una evaluación real). */
  proyeccion?: { fecha: string; ovr: number } | null;
}) {
  const [metrica, setMetrica] = useState<Metrica>("ovr");
  // El formateo de fecha usa la zona horaria del que mira: si se calculara
  // igual en SSR (servidor en UTC) y en el cliente, un mismatch de texto entre
  // ambos dispara un error de hidratación en React. Se difiere el cálculo (y
  // el montaje del chart, que Recharts igual no puede medir bien en SSR) a
  // después de montar en el cliente.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  if (datos.length < 2) {
    return (
      <p className="text-sm text-muted">
        Necesitas al menos dos evaluaciones para ver la evolución.
      </p>
    );
  }

  if (!montado) {
    return <div className="h-60" aria-hidden />;
  }

  // La punteada es solo de OVR: el resto de los stats nunca se proyecta.
  const mostrarProyeccion = metrica === "ovr" && !!proyeccion;
  const formatearFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short" });

  interface PuntoChart {
    fecha: string;
    valor: number | undefined;
    valorProyectado: number | undefined;
  }

  const data: PuntoChart[] = datos.map((d, i) => ({
    fecha: formatearFecha(d.fecha),
    valor: d[metrica],
    // El último punto real arranca la punteada exactamente donde termina
    // la sólida (mismo valor, misma fecha) — sin esto quedaría un salto.
    valorProyectado: mostrarProyeccion && i === datos.length - 1 ? d.ovr : undefined,
  }));
  if (mostrarProyeccion) {
    data.push({
      fecha: formatearFecha(proyeccion!.fecha),
      valor: undefined,
      valorProyectado: proyeccion!.ovr,
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {METRICAS.map((m) => (
          <button
            key={m}
            onClick={() => setMetrica(m)}
            className={`rounded px-2 py-1 text-xs font-semibold uppercase ${
              metrica === m
                ? "bg-brand text-base"
                : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--color-subtle)" strokeDasharray="3 3" />
          <XAxis dataKey="fecha" stroke="var(--color-muted)" fontSize={12} />
          <YAxis domain={[0, 99]} stroke="var(--color-muted)" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-subtle)",
              borderRadius: 8,
              color: "var(--color-foreground)",
            }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            name={metrica.toUpperCase()}
            stroke="var(--brand)"
            strokeWidth={3}
            dot={{ r: 4 }}
            isAnimationActive
          />
          {mostrarProyeccion && (
            <Line
              type="monotone"
              dataKey="valorProyectado"
              name="Proyección"
              stroke="var(--brand)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {mostrarProyeccion && (
        <p className="mt-2 text-xs text-muted">
          La punteada es una proyección — se confirma recién en la próxima
          evaluación.
        </p>
      )}
    </div>
  );
}
