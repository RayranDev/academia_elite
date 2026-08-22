"use client";

import { MEDIOS_PAGO, etiquetaMedioPago } from "@/lib/validators/membresia";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export interface FilaMedio {
  medio: (typeof MEDIOS_PAGO)[number];
  monto: string;
  referencia: string;
}

export const MAX_MEDIOS_PAGO = 4;

/**
 * Filas de "cómo se pagó": medio + monto + referencia + comprobante, una fila
 * por medio. Un pago puede entrar mitad efectivo y mitad Nequi, así que no
 * alcanza con un solo campo — de ahí que sea una lista, no un `<select>` suelto.
 *
 * Los `name=` de los inputs son indexados (`medio-0`, `monto-0`, …) porque el
 * form que lo envuelve los lee así (`reportarPagoDesdeFormData`); este
 * componente es el único lugar que conoce esa convención de nombres, tanto
 * para el reporte de la familia como para el registro directo de la escuela.
 */
export function CamposMedios({
  medios,
  onChange,
  onAgregar,
}: {
  medios: FilaMedio[];
  onChange: (i: number, cambios: Partial<FilaMedio>) => void;
  onAgregar: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-muted">Cómo se pagó</p>
      {medios.map((m, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select
            name={`medio-${i}`}
            value={m.medio}
            onChange={(e) => onChange(i, { medio: e.target.value as FilaMedio["medio"] })}
            className={input}
          >
            {MEDIOS_PAGO.map((med) => (
              <option key={med} value={med}>
                {etiquetaMedioPago(med)}
              </option>
            ))}
          </select>
          <input
            name={`monto-${i}`}
            type="number"
            min={0}
            step="any"
            placeholder="Monto"
            value={m.monto}
            onChange={(e) => onChange(i, { monto: e.target.value })}
            className={input}
          />
          <input
            name={`referencia-${i}`}
            placeholder="N° de referencia"
            maxLength={60}
            value={m.referencia}
            onChange={(e) => onChange(i, { referencia: e.target.value })}
            className={input}
          />
          <input
            name={`comprobante-${i}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-surface-2 file:px-2 file:py-1.5"
          />
        </div>
      ))}
      <input type="hidden" name="medios-count" value={medios.length} />
      {medios.length < MAX_MEDIOS_PAGO && (
        <button
          type="button"
          onClick={onAgregar}
          className="text-xs font-semibold text-muted hover:text-brand"
        >
          + Agregar otro medio (pagó con dos formas distintas)
        </button>
      )}
    </div>
  );
}
