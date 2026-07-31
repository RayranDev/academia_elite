"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearArancelAction,
  desactivarArancelAction,
} from "@/actions/arancel.actions";
import {
  CONCEPTOS_MEMBRESIA,
  ETIQUETA_CONCEPTO,
} from "@/lib/validators/membresia";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FechaLocal } from "@/components/ui/FechaLocal";
import type { ActionResult } from "@/lib/action-result";
import type { ArancelDTO } from "@/services/arancel.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function ArancelesPanel({
  aranceles,
  categorias,
}: {
  aranceles: ArancelDTO[];
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(async (_prev, fd) => {
    const res = await crearArancelAction(undefined, fd);
    if (res.ok) router.refresh();
    return res;
  }, undefined);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-bold">Agregar precio</h2>
        <form action={formAction} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="categoriaId">
              Categoría
            </label>
            <select id="categoriaId" name="categoriaId" defaultValue="" className={input}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="concepto">
              Concepto
            </label>
            <select id="concepto" name="concepto" defaultValue="MENSUALIDAD" className={input}>
              {CONCEPTOS_MEMBRESIA.map((c) => (
                <option key={c} value={c}>{ETIQUETA_CONCEPTO[c] ?? c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="monto">
              Monto
            </label>
            <input
              id="monto"
              name="monto"
              type="number"
              min={0}
              step="any"
              required
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="vigenteDesde">
              Rige desde (opcional)
            </label>
            <input id="vigenteDesde" name="vigenteDesde" type="date" className={input} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Guardando…" : "Agregar precio"}
            </Button>
          </div>
        </form>
        {state && !state.ok && (
          <p className="mt-2 text-sm text-alerta" role="alert">{state.error}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          El precio de una categoría gana sobre el general. Si dejas la fecha
          vacía rige desde hoy; con una fecha futura queda programado y no se
          aplica hasta entonces. Los precios anteriores se conservan como
          historial.
        </p>
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="p-4 text-lg font-bold">Lista de precios</h2>
        {aranceles.length === 0 ? (
          <p className="p-4 pt-0 text-sm text-muted">
            Sin precios cargados. Sin al menos uno, la cobranza del mes se genera
            sin montos.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2">Monto</th>
                <th className="px-4 py-2">Rige desde</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {aranceles.map((a) => (
                <tr key={a.id} className="border-b border-subtle/50">
                  <td className="px-4 py-2">{a.categoriaNombre}</td>
                  <td className="px-4 py-2 text-muted">
                    {ETIQUETA_CONCEPTO[a.concepto] ?? a.concepto}
                  </td>
                  <td className="px-4 py-2 tabular">{a.monto}</td>
                  <td className="px-4 py-2 text-muted">
                    <FechaLocal iso={a.vigenteDesde} formato="d MMM yyyy" />
                  </td>
                  <td className="px-4 py-2">
                    <Badge tono={a.activo ? "pitch" : "alerta"}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    {a.activo && <Desactivar arancelId={a.id} />}
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

/** Baja lógica: el precio queda en la tabla como historial, no se borra. */
function Desactivar({ arancelId }: { arancelId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // El servicio devuelve `{ ok: false, error }` para "no encontrado" y "ya está
  // inactivo". Consumir solo `ok` dejaría al usuario mirando una fila que no
  // cambia y sin ningún mensaje: el contrato `ActionResult` existe justamente
  // para que la UI atienda la rama falsa (AGENTS.md §5).
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const fd = new FormData();
          fd.set("arancelId", arancelId);
          startTransition(async () => {
            const res = await desactivarArancelAction(undefined, fd);
            if (res.ok) {
              setError(null);
              router.refresh();
            } else {
              setError(res.error);
            }
          });
        }}
        className="text-left text-xs font-semibold text-muted hover:text-alerta disabled:opacity-50"
      >
        {pending ? "…" : "Desactivar"}
      </button>
      {error && (
        <p className="text-xs text-alerta" role="alert">{error}</p>
      )}
    </div>
  );
}
