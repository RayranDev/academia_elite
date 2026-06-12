"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { crearEvaluacionAction } from "@/actions/dt.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlayerCard } from "@/components/cards/PlayerCard";
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

const FISICAS: [string, string, string][] = [
  ["sprint30mSeg", "Sprint 30 m (seg)", "5.2"],
  ["saltoVerticalCm", "Salto vertical (cm)", "30"],
  ["agilidadIllinoisSeg", "Agilidad Illinois (seg)", "18.0"],
  ["resistenciaYoyoNivel", "Resistencia Yo-Yo (nivel)", "9"],
];
const TECNICAS: [string, string][] = [
  ["controlBalon", "Control"],
  ["pase", "Pase"],
  ["tiro", "Tiro"],
  ["regate", "Regate"],
];
const MENTALIDAD: [string, string][] = [
  ["actitud", "Actitud"],
  ["concentracion", "Concentración"],
  ["trabajoEquipo", "Trabajo en equipo"],
  ["resiliencia", "Resiliencia"],
];

export function EvaluationForm({ jugador }: { jugador: JugadorMin }) {
  const [state, action, pending] = useActionState<
    ActionResult<ResultadoStats> | undefined,
    FormData
  >(crearEvaluacionAction, undefined);

  const resultado = state?.ok ? state.data : undefined;
  const celebrado = useRef(false);

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
          {FISICAS.map(([name, label, ph]) => (
            <div key={name}>
              <label className="mb-1 block text-xs text-muted">{label}</label>
              <input name={name} type="number" step="0.01" min="0" placeholder={ph} required className={input} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-bold text-brand">Técnicas (1–10)</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          {TECNICAS.map(([name, label]) => (
            <Nota key={name} name={name} label={label} />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-bold text-brand">Mentalidad (1–10)</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          {MENTALIDAD.map(([name, label]) => (
            <Nota key={name} name={name} label={label} />
          ))}
        </div>
      </Card>

      <Card>
        <label className="mb-1 block text-xs text-muted">
          Observaciones privadas (visibles solo para el padre y el DT)
        </label>
        <textarea name="observacionesPrivadas" rows={3} className={input} />
      </Card>

      {state && !state.ok && (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Calculando carta…" : "Guardar evaluación y generar carta"}
      </Button>
    </form>
  );
}

function Nota({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <input
        name={name}
        type="number"
        min="1"
        max="10"
        step="0.5"
        defaultValue="5"
        required
        className={input}
      />
    </div>
  );
}
