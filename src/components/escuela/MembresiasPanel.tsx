"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  registrarMembresiaAction,
  cambiarEstadoMembresiaAction,
} from "@/actions/membresia.actions";
import { ESTADOS_MEMBRESIA } from "@/lib/validators/membresia";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ActionResult } from "@/lib/action-result";
import type { MembresiaDTO } from "@/services/membresia.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

const TONO: Record<string, "pitch" | "oro" | "alerta"> = {
  PAGADA: "pitch",
  PENDIENTE: "oro",
  VENCIDA: "alerta",
};

export function MembresiasPanel({
  membresias,
  jugadores,
}: {
  membresias: MembresiaDTO[];
  jugadores: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (_prev, fd) => {
      const res = await registrarMembresiaAction(undefined, fd);
      if (res.ok) router.refresh();
      return res;
    },
    undefined,
  );

  const vencidas = membresias.filter((m) => m.estado === "VENCIDA").length;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-bold">Registrar / actualizar cuota</h2>
        <form action={formAction} className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Jugador</label>
            <select name="jugadorId" required className={input}>
              <option value="">Elige…</option>
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>{j.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Período</label>
            <input name="periodo" type="month" required className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Monto (opcional)</label>
            <input name="monto" type="number" min={0} step="any" className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Estado</label>
            <select name="estado" defaultValue="PENDIENTE" className={input}>
              {ESTADOS_MEMBRESIA.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Guardando…" : "Guardar cuota"}
            </Button>
          </div>
        </form>
        {state && !state.ok && (
          <p className="mt-2 text-sm text-alerta" role="alert">{state.error}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          El período usa el mes seleccionado (AAAA-MM). Volver a guardar el mismo
          jugador y mes actualiza la cuota existente.
        </p>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-bold">Cuotas</h2>
          {vencidas > 0 && <Badge tono="alerta">{vencidas} vencida(s)</Badge>}
        </div>
        {membresias.length === 0 ? (
          <p className="p-4 pt-0 text-sm text-muted">Sin cuotas registradas.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Jugador</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Período</th>
                <th className="px-4 py-2">Monto</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Cambiar</th>
              </tr>
            </thead>
            <tbody>
              {membresias.map((m) => (
                <tr key={m.id} className="border-b border-subtle/50">
                  <td className="px-4 py-2">{m.jugadorNombre}</td>
                  <td className="px-4 py-2 text-muted">{m.categoriaNombre}</td>
                  <td className="px-4 py-2 tabular">{m.periodo}</td>
                  <td className="px-4 py-2 tabular">{m.monto != null ? m.monto : "—"}</td>
                  <td className="px-4 py-2">
                    <Badge tono={TONO[m.estado] ?? "oro"}>{m.estado}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <CambiarEstado membresiaId={m.id} estadoActual={m.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function CambiarEstado({
  membresiaId,
  estadoActual,
}: {
  membresiaId: string;
  estadoActual: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function cambiar(estado: string) {
    if (estado === estadoActual) return;
    const fd = new FormData();
    fd.set("membresiaId", membresiaId);
    fd.set("estado", estado);
    startTransition(async () => {
      const res = await cambiarEstadoMembresiaAction(undefined, fd);
      if (res.ok) router.refresh();
    });
  }

  return (
    <select
      value={estadoActual}
      disabled={pending}
      onChange={(e) => cambiar(e.target.value)}
      aria-label="Cambiar estado de la cuota"
      className="rounded-lg border border-subtle bg-surface-2 px-2 py-1 text-xs outline-none focus:border-brand"
    >
      {ESTADOS_MEMBRESIA.map((e) => (
        <option key={e} value={e}>{e}</option>
      ))}
    </select>
  );
}
