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
import type { EvolucionPunto } from "@/services/player.service";

const METRICAS = ["ovr", "rit", "tir", "pas", "reg", "def", "fis", "men"] as const;
type Metrica = (typeof METRICAS)[number];

export function EvolutionChart({ datos }: { datos: EvolucionPunto[] }) {
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

  const data = datos.map((d) => ({
    fecha: new Date(d.fecha).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
    }),
    valor: d[metrica],
  }));

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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
