"use client";

import { useRouter } from "next/navigation";

/**
 * Elige con qué parámetros simula la carta: predeterminados (globales) o los de
 * una escuela puntual (sus overrides). Navega con `?escuela=<id>` para que la
 * página (server) cargue la config correspondiente.
 */
export function SelectorSimulador({
  escuelas,
  actual,
}: {
  escuelas: { id: string; nombre: string }[];
  actual: string;
}) {
  const router = useRouter();
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold">Simular con parámetros de:</span>
      <select
        value={actual}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v === "GLOBAL" ? "/admin/simulador" : `/admin/simulador?escuela=${v}`);
        }}
        aria-label="Parámetros del simulador"
        className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
      >
        <option value="GLOBAL">Predeterminados (global)</option>
        {escuelas.map((e) => (
          <option key={e.id} value={e.id}>{e.nombre}</option>
        ))}
      </select>
    </label>
  );
}
