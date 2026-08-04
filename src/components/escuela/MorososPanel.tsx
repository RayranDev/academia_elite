"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { bloquearAccesoJugadoresAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatearMonto } from "@/lib/cobranza";
import { ETIQUETA_BLOQUEO } from "@/lib/bloqueo";
import { TIPOS_BLOQUEO } from "@/types";
import type { JugadorGestionDTO } from "@/services/gestion-jugadores.service";
import type { ResultadoBloqueoMasivo } from "@/services/bloqueo.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Bloqueo masivo de familias en mora. Mismo patrón de selección que
 * `ProgresoMasivo` (Set de ids + "marcar todos visibles"), pero la acción en
 * lote pega un jugador a la vez del lado del servicio: por eso el resultado
 * distingue bloqueados de fallidos en vez de un simple ok/error.
 */
export function MorososPanel({ morosos }: { morosos: JugadorGestionDTO[] }) {
  const router = useRouter();
  const [incluidos, setIncluidos] = useState<Set<string>>(new Set());
  const [tipo, setTipo] = useState<string>("PAGO");
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<ResultadoBloqueoMasivo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Los ya bloqueados no se pueden volver a incluir: no tiene sentido
  // reenviar un bloqueo sobre una familia que ya está bloqueada.
  const seleccionables = useMemo(
    () => morosos.filter((j) => !j.bloqueado),
    [morosos],
  );

  function toggleIncluido(id: string, val: boolean) {
    setIncluidos((s) => {
      const n = new Set(s);
      if (val) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function marcarTodos() {
    setIncluidos(new Set(seleccionables.map((j) => j.id)));
  }

  function desmarcarTodos() {
    setIncluidos(new Set());
  }

  function bloquear() {
    if (incluidos.size === 0) {
      setError("Selecciona al menos un jugador.");
      return;
    }
    if (tipo === "PERSONALIZADO" && !mensaje.trim()) {
      setError("Escribe el mensaje personalizado.");
      return;
    }
    const fd = new FormData();
    fd.set("jugadorIds", JSON.stringify(Array.from(incluidos)));
    fd.set("tipo", tipo);
    if (tipo === "PERSONALIZADO") fd.set("mensaje", mensaje.trim());
    startTransition(async () => {
      const res = await bloquearAccesoJugadoresAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setResultado(res.data ?? { bloqueados: 0, fallidos: [] });
        setIncluidos(new Set());
        router.refresh();
      } else {
        setResultado(null);
        setError(res.error);
      }
    });
  }

  if (morosos.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        titulo="Sin morosos"
        texto="No hay jugadores activos con cuotas vencidas."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-xl border border-subtle bg-surface p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Motivo del bloqueo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={input}
          >
            {TIPOS_BLOQUEO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_BLOQUEO[t]}
              </option>
            ))}
          </select>
        </div>
        {tipo === "PERSONALIZADO" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">
              Mensaje que verá cada familia
            </label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={2}
              maxLength={300}
              className={input}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={marcarTodos}
          className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted hover:text-foreground"
        >
          Marcar todos visibles
        </button>
        <button
          type="button"
          onClick={desmarcarTodos}
          className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted hover:text-foreground"
        >
          Desmarcar todos
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-subtle bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle text-left text-xs text-muted">
              <th className="p-2 font-semibold">Jugador</th>
              <th className="p-2 font-semibold">Categoría</th>
              <th className="p-2 font-semibold">Monto vencido</th>
              <th className="p-2 text-center font-semibold">Incluir</th>
            </tr>
          </thead>
          <tbody>
            {morosos.map((j) => (
              <tr key={j.id} className="border-b border-subtle/60 last:border-0">
                <td className="p-2">
                  <p className="font-semibold">
                    {j.apellido} {j.nombre}
                  </p>
                </td>
                <td className="p-2 text-muted">{j.categoriaNombre}</td>
                <td className="p-2 tabular">{formatearMonto(j.montoVencido)}</td>
                <td className="p-2 text-center">
                  {j.bloqueado ? (
                    <Badge tono="alerta">Ya bloqueado</Badge>
                  ) : (
                    <input
                      type="checkbox"
                      aria-label={`Incluir a ${j.nombre}`}
                      className="h-4 w-4 accent-[var(--brand)]"
                      checked={incluidos.has(j.id)}
                      disabled={pending}
                      onChange={(e) => toggleIncluido(j.id, e.target.checked)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-alerta" role="alert">
          {error}
        </p>
      )}
      {resultado && (
        <div className="text-sm">
          <p className="text-brand">
            {resultado.bloqueados} bloqueado(s)
            {resultado.fallidos.length > 0 ? ` · ${resultado.fallidos.length} fallido(s)` : ""}.
          </p>
          {resultado.fallidos.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-muted">
              {resultado.fallidos.map((f) => {
                const j = morosos.find((m) => m.id === f.jugadorId);
                return (
                  <li key={f.jugadorId}>
                    {j ? `${j.apellido} ${j.nombre}` : f.jugadorId}: {f.motivo}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <Button onClick={bloquear} disabled={pending || incluidos.size === 0}>
        {pending ? "Bloqueando…" : `Bloquear seleccionados (${incluidos.size})`}
      </Button>
    </div>
  );
}
