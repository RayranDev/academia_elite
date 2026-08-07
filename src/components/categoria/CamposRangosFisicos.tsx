import { ETIQUETA_PRUEBA, type FilaRangoFisico, type PruebaFisica } from "@/lib/stats-engine";

/** Subconjunto de `RangosCategoriaDTO["pruebas"]` que este componente necesita. */
export type DefaultValuesRangos = { prueba: PruebaFisica; min: number; max: number }[];

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** `prueba` para la etiqueta, `campo` para el nombre de input (calza con `FilaRangoFisico`). */
const CAMPOS: {
  prueba: PruebaFisica;
  campoMin: keyof FilaRangoFisico;
  campoMax: keyof FilaRangoFisico;
  ayuda: string;
  step: number;
}[] = [
  {
    prueba: "sprint30mSeg",
    campoMin: "sprintMin",
    campoMax: "sprintMax",
    ayuda: "Menos es mejor: el mínimo es la MEJOR marca.",
    step: 0.1,
  },
  {
    prueba: "saltoVerticalCm",
    campoMin: "saltoMin",
    campoMax: "saltoMax",
    ayuda: "Más es mejor: el máximo es la MEJOR marca.",
    step: 1,
  },
  {
    prueba: "agilidadIllinoisSeg",
    campoMin: "agilidadMin",
    campoMax: "agilidadMax",
    ayuda: "Menos es mejor: el mínimo es la MEJOR marca.",
    step: 0.1,
  },
  {
    prueba: "resistenciaYoyoNivel",
    campoMin: "yoyoMin",
    campoMax: "yoyoMax",
    ayuda: "Más es mejor: el máximo es la MEJOR marca.",
    step: 0.5,
  },
];

/**
 * Los 8 campos min/max de calibración física de una categoría (4 pruebas ×
 * min/max). Presentacional puro: sin `useActionState` ni guards, se comparte
 * entre el modal self-service (ESCUELA_ADMIN) y el modal del SUPER_ADMIN en
 * soporte — cada uno lo envuelve en su propio `<form action=…>`.
 */
export function CamposRangosFisicos({
  defaultValues,
  idPrefix = "",
}: {
  defaultValues?: DefaultValuesRangos;
  idPrefix?: string;
}) {
  const porPrueba = new Map((defaultValues ?? []).map((p) => [p.prueba, p]));
  return (
    <div className="space-y-3">
      {CAMPOS.map((c) => (
        <div key={c.prueba} className="border-t border-subtle pt-3 first:border-t-0 first:pt-0">
          <p className="text-sm font-semibold">{ETIQUETA_PRUEBA[c.prueba]}</p>
          <p className="mb-1.5 text-xs text-muted">{c.ayuda}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted" htmlFor={`${idPrefix}${c.campoMin}`}>
                Mínimo
              </label>
              <input
                id={`${idPrefix}${c.campoMin}`}
                name={c.campoMin}
                type="number"
                step={c.step}
                required
                defaultValue={porPrueba.get(c.prueba)?.min}
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted" htmlFor={`${idPrefix}${c.campoMax}`}>
                Máximo
              </label>
              <input
                id={`${idPrefix}${c.campoMax}`}
                name={c.campoMax}
                type="number"
                step={c.step}
                required
                defaultValue={porPrueba.get(c.prueba)?.max}
                className={input}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
