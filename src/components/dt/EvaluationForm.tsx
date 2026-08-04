"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { crearEvaluacionAction } from "@/actions/dt.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlayerCard } from "@/components/cards/PlayerCard";
import {
  CLAVES_TECNICAS,
  medidasTecnicas,
  tituloBloqueTecnico,
} from "@/lib/medidas-tecnicas";
import type { ActionResult } from "@/lib/action-result";
import type { ResultadoStats } from "@/lib/stats-engine";
import type { PlayerCardData, Posicion } from "@/types";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm tabular outline-none focus:border-brand";

interface JugadorMin {
  id: string;
  nombre: string;
  apellido: string;
  posicion: Posicion;
  dorsal?: number;
}

// Cada prueba lleva CÓMO se mide: sin eso, dos DT miden distinto y las cartas
// dejan de ser comparables entre sí, que es todo el sentido del sistema.
const FISICAS: [string, string, string, string][] = [
  [
    "sprint30mSeg",
    "Sprint 30 m (seg)",
    "5.2",
    "Tiempo en recorrer 30 m en línea recta, saliendo desde parada. Menos es mejor.",
  ],
  [
    "saltoVerticalCm",
    "Salto vertical (cm)",
    "30",
    "Diferencia entre el alcance de pie y el alcance saltando, sin carrera previa.",
  ],
  [
    "agilidadIllinoisSeg",
    "Agilidad Illinois (seg)",
    "18.0",
    "Segundos en completar el circuito estándar de conos Illinois. Menos es mejor.",
  ],
  [
    "resistenciaYoyoNivel",
    "Resistencia Yo-Yo (nivel)",
    "9",
    "Nivel alcanzado en el test Yo-Yo de recuperación intermitente.",
  ],
];
const MENTALIDAD: [string, string, string][] = [
  ["actitud", "Actitud", "Compromiso en el entrenamiento y ante la adversidad."],
  ["concentracion", "Concentración", "Sostiene la atención durante todo el trabajo."],
  ["trabajoEquipo", "Trabajo en equipo", "Juega para el equipo, comunica y acompaña."],
  ["resiliencia", "Resiliencia", "Se repone del error sin caerse el rendimiento."],
];

/** Rúbrica del 1 al 10, para que la nota signifique lo mismo entre DTs. */
const RUBRICA =
  "1-3: muy por debajo de su categoría · 4-6: en el promedio · 7-8: por encima · 9-10: referente del equipo.";

// Las 8 notas 1-10 (técnicas + mentalidad). Se evalúan con botones, no con un
// input con default 5: el 5 precargado invita a "evaluar todo 5" sin pensar.
//
// Las 4 técnicas viajan siempre en las mismas columnas, pero lo que significan
// depende de la posición: a un arquero no se le evalúa el regate sino el achique
// (`src/lib/medidas-tecnicas.ts`), y el motor lo deriva con otra fórmula.
const NOTAS = [...CLAVES_TECNICAS, ...MENTALIDAD.map(([name]) => name)];

export function EvaluationForm({ jugador }: { jugador: JugadorMin }) {
  // Qué se le pide puntuar al DT depende de la posición del jugador.
  const tecnicas = medidasTecnicas(jugador.posicion);
  const [state, action, pending] = useActionState<
    ActionResult<ResultadoStats> | undefined,
    FormData
  >(crearEvaluacionAction, undefined);

  const resultado = state?.ok ? state.data : undefined;
  const celebrado = useRef(false);

  // Sin valor precargado: cada nota es una elección consciente del DT.
  const [notas, setNotas] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(NOTAS.map((n) => [n, null])),
  );
  const completas = NOTAS.every((n) => notas[n] != null);

  useEffect(() => {
    if (resultado && !celebrado.current) {
      celebrado.current = true;
      const prefiereReducir = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!prefiereReducir) {
        confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
      }
    }
  }, [resultado]);

  if (resultado) {
    const card: PlayerCardData = {
      nombre: jugador.nombre,
      apellido: jugador.apellido,
      posicion: jugador.posicion,
      ovr: resultado.ovr,
      nivel: resultado.nivel,
      stats: {
        rit: resultado.rit,
        tir: resultado.tir,
        pas: resultado.pas,
        reg: resultado.reg,
        def: resultado.def,
        fis: resultado.fis,
      },
      men: resultado.men,
      fotoUrl: null,
      dorsal: jugador.dorsal,
    };
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-2xl font-black italic uppercase">
          ¡La carta nació!
        </h2>
        <div className="perspective-[1000px]">
          <PlayerCard data={card} size="hero" interactive />
        </div>
        {resultado.bonusAplicado > 0 && (
          <p className="text-sm text-pitch">
            Incluye +{resultado.bonusAplicado} por logros.
          </p>
        )}
        <div className="flex gap-3">
          <Link href={`/dt/jugadores/${jugador.id}`}>
            <Button>Ver ficha del jugador</Button>
          </Link>
          <Link href="/dt">
            <Button variant="secondary">Volver a la plantilla</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="jugadorId" value={jugador.id} />

      <Card>
        <h3 className="mb-3 text-lg font-bold text-brand">Físicas (medidas reales)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {FISICAS.map(([name, label, ph, ayuda]) => (
            <div key={name}>
              <label className="mb-1 block text-xs text-muted">{label}</label>
              <input name={name} type="number" step="0.01" min="0" placeholder={ph} required className={input} />
              <p className="mt-1 text-[11px] leading-snug text-muted">{ayuda}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-lg font-bold text-brand">
          {tituloBloqueTecnico(jugador.posicion)} (1–10)
        </h3>
        <p className="mb-3 text-[11px] leading-snug text-muted">{RUBRICA}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CLAVES_TECNICAS.map((name) => {
            const { etiqueta, ayuda } = tecnicas[name];
            return (
              <Nota
                key={name}
                name={name}
                label={etiqueta}
                ayuda={ayuda}
                valor={notas[name]}
                onElegir={(v) => setNotas((prev) => ({ ...prev, [name]: v }))}
              />
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-lg font-bold text-brand">Mentalidad (1–10)</h3>
        <p className="mb-3 text-[11px] leading-snug text-muted">{RUBRICA}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {MENTALIDAD.map(([name, label, ayuda]) => (
            <Nota
              key={name}
              name={name}
              label={label}
              ayuda={ayuda}
              valor={notas[name]}
              onElegir={(v) => setNotas((prev) => ({ ...prev, [name]: v }))}
            />
          ))}
        </div>
      </Card>

      <Card>
        {/* Decía "privadas ... visibles solo para el padre y el DT": contradictorio.
            Se nombra por quién las lee (PLAN-UX-DT PR-2). */}
        <label className="mb-1 block text-xs text-muted">
          Observaciones para la familia (las verá el acudiente)
        </label>
        <textarea name="observacionesPrivadas" rows={3} className={input} />
      </Card>

      {state && !state.ok && (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      )}

      {!completas && (
        <p className="text-xs text-muted">
          Elige las 8 notas (técnicas y mentalidad) para poder guardar.
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending || !completas}>
        {pending ? "Calculando carta…" : "Guardar evaluación y generar carta"}
      </Button>
    </form>
  );
}

/**
 * Nota 1–10 por botones (PLAN-UX-DT PR-5 · B5). Sin default: el valor viaja en
 * un input hidden para no tocar `crearEvaluacionAction`. Targets ≥ 44px.
 */
function Nota({
  name,
  label,
  ayuda,
  valor,
  onElegir,
}: {
  name: string;
  label: string;
  ayuda?: string;
  valor: number | null;
  onElegir: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-xs text-muted">{label}</label>
      {ayuda && (
        <p className="mb-1 text-[11px] leading-snug text-muted/80">{ayuda}</p>
      )}
      {valor != null && <input type="hidden" name={name} value={valor} />}
      <div className="flex flex-wrap gap-1" data-nota={name}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onElegir(n)}
            aria-pressed={valor === n}
            className={`min-h-11 min-w-11 flex-1 rounded-lg border text-sm font-bold tabular transition-colors ${
              valor === n
                ? "border-brand bg-brand/15 text-brand"
                : "border-subtle text-muted hover:border-brand/50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
