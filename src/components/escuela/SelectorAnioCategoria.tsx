"use client";

import { useState } from "react";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50";

// El año NO se calcula acá con `new Date()`: este módulo también se evalúa en
// el SSR de este client component, y el server corre en UTC — un 31/12 a la
// noche en Colombia el server ya está en el año siguiente y el cliente no,
// así que las <option> y los defaultValue no coincidirían (hydration mismatch,
// AGENTS.md §6). Llega como prop desde el Server Component, que es una sola
// fuente de verdad para ambos renders.

/**
 * Selector de rango de años para una categoría, con opción "sin edad" para
 * ligas libres, equipos mixtos o de adultos. Al tildar el checkbox, los
 * selects se deshabilitan — un `<select disabled>` no viaja en el FormData
 * al enviar el form (mismo patrón que `FichaMedicaModal`).
 */
export function SelectorAnioCategoria({
  anioActual,
  defaultAnioDesde,
  defaultAnioHasta,
}: {
  anioActual: number;
  defaultAnioDesde?: number;
  defaultAnioHasta?: number;
}) {
  const [sinEdad, setSinEdad] = useState(false);

  const anios = Array.from({ length: 22 }, (_, i) => anioActual + 1 - i);
  // Default con sentido futbolístico: una franja de dos años alrededor de los
  // 12-13. Arrancar en el año actual (= recién nacidos) no le sirve a nadie y
  // obliga a corregir los dos selects en cada alta.
  const desde = defaultAnioDesde ?? anioActual - 13;
  const hasta = defaultAnioHasta ?? anioActual - 12;

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
          <label htmlFor="cat-anio-desde" className="mb-1 block text-xs text-muted">
            Año desde
          </label>
          <select
            id="cat-anio-desde"
            name="anioDesde"
            defaultValue={desde}
            disabled={sinEdad}
            className={input}
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cat-anio-hasta" className="mb-1 block text-xs text-muted">
            Año hasta
          </label>
          <select
            id="cat-anio-hasta"
            name="anioHasta"
            defaultValue={hasta}
            disabled={sinEdad}
            className={input}
          >
            {anios.map((a) => (
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
