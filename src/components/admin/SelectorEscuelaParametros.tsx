"use client";

import { useRouter } from "next/navigation";

/**
 * Selector de objetivo de los parámetros: "Predeterminados (global)" o una
 * escuela puntual. Navega con `?escuela=<id>` para que la página (server) cargue
 * los valores de ese objetivo. Editar global afecta a las escuelas sin override;
 * editar una escuela solo la afecta a ella.
 */
export function SelectorEscuelaParametros({
  escuelas,
  actual,
}: {
  escuelas: { id: string; nombre: string }[];
  actual: string;
}) {
  const router = useRouter();
  return (
    <select
      value={actual}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v === "GLOBAL" ? "/admin/parametros" : `/admin/parametros?escuela=${v}`);
      }}
      aria-label="Objetivo de los parámetros"
      className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
    >
      <option value="GLOBAL">Predeterminados (global)</option>
      {escuelas.map((e) => (
        <option key={e.id} value={e.id}>{e.nombre}</option>
      ))}
    </select>
  );
}
