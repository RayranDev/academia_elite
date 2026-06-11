"use client";

import { useState } from "react";
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

  const data = datos.map((d) => ({
    fecha: new Date(d.fecha).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
    }),
    valor: d[metrica],
  }));

  if (datos.length < 2) {
    return (
      <p className="text-sm text-muted">
        Necesitas al menos dos evaluaciones para ver la evolución.
      </p>
    );
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
          <CartesianGrid stroke="#1E2A44" strokeDasharray="3 3" />
          <XAxis dataKey="fecha" stroke="#94A3B8" fontSize={12} />
          <YAxis domain={[0, 99]} stroke="#94A3B8" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "#0D1322",
              border: "1px solid #1E2A44",
              borderRadius: 8,
              color: "#F1F5F9",
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
