"use client";

import { useState } from "react";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50";

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 22 }, (_, i) => ANIO_ACTUAL + 1 - i);

/**
 * Selector de rango de años para una categoría, con opción "sin edad" para
 * ligas libres, equipos mixtos o de adultos. Al tildar el checkbox, los
 * selects se deshabilitan — un `<select disabled>` no viaja en el FormData
 * al enviar el form (mismo patrón que `FichaMedicaModal`).
 */
export function SelectorAnioCategoria({
  defaultAnioDesde,
  defaultAnioHasta,
}: {
  defaultAnioDesde?: number;
  defaultAnioHasta?: number;
}) {
  const [sinEdad, setSinEdad] = useState(false);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="sinEdad"
          checked={sinEdad}
          onChange={(e) => setSinEdad(e.target.checked)}
        />
        Categoría sin edad (libre, mixta, adultos…)
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Año desde</label>
          <select
            name="anioDesde"
            defaultValue={defaultAnioDesde ?? ANIO_ACTUAL}
            disabled={sinEdad}
            className={input}
          >
            {ANIOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Año hasta</label>
          <select
            name="anioHasta"
            defaultValue={defaultAnioHasta ?? ANIO_ACTUAL}
            disabled={sinEdad}
            className={input}
          >
            {ANIOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
