"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearDescuentoReglaAction,
  desactivarDescuentoReglaAction,
} from "@/actions/descuento.actions";
import { TIPOS_DESCUENTO, etiquetaTipoDescuento } from "@/lib/validators/descuento";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatearMonto } from "@/lib/cobranza";
import { EditarDescuentoReglaModal } from "@/components/escuela/EditarDescuentoReglaModal";
import { AsignarJugadoresDescuentoModal } from "@/components/escuela/AsignarJugadoresDescuentoModal";
import type { DescuentoReglaDTO } from "@/services/descuento.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  categoriaId: string;
}

/** Formatea el valor según su tipo: 10% o $45.000. */
function formatearValor(tipo: string, valor: number): string {
  return tipo === "PORCENTAJE" ? `${valor}%` : formatearMonto(valor);
}

export function DescuentosPanel({
  reglas,
  categorias,
  jugadores,
  asignacionesPorRegla,
}: {
  reglas: DescuentoReglaDTO[];
  categorias: { id: string; nombre: string }[];
  jugadores: Jugador[];
  /** Ids de jugadores ya asignados, por regla — precarga el modal de asignación. */
  asignacionesPorRegla: Record<string, string[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<DescuentoReglaDTO | null>(null);
  const [asignando, setAsignando] = useState<DescuentoReglaDTO | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await crearDescuentoReglaAction(undefined, fd);
      if (res.ok) {
        setError(null);
        form.reset();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-bold">Nueva regla de descuento</h2>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="categoriaId">
              Categoría
            </label>
            <select
              id="categoriaId"
              name="categoriaId"
              defaultValue={categorias[0]?.id ?? ""}
              required
              className={input}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="nombre">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              maxLength={60}
              required
              placeholder="Hermano, Beca deportiva…"
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="tipo">
              Tipo
            </label>
            <select id="tipo" name="tipo" defaultValue="PORCENTAJE" className={input}>
              {TIPOS_DESCUENTO.map((t) => (
                <option key={t} value={t}>{etiquetaTipoDescuento(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="valor">
              Valor
            </label>
            <input
              id="valor"
              name="valor"
              type="number"
              min={0}
              step="any"
              required
              className={input}
            />
          </div>
          <div className="flex items-end sm:col-span-4">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Guardando…" : "Agregar regla"}
            </Button>
          </div>
        </form>
        {error && (
          <p className="mt-2 text-sm text-alerta" role="alert">{error}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          Un porcentaje se calcula sobre el precio de la cuota; un monto fijo
          se descuenta tal cual, sin superar el precio. Si un jugador
          califica para más de una regla, se aplica la de mayor descuento.
        </p>
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="p-4 text-lg font-bold">Reglas de descuento</h2>
        {reglas.length === 0 ? (
          <p className="p-4 pt-0 text-sm text-muted">
            Sin reglas cargadas. Sin al menos una, la cobranza del mes se
            genera sin descuentos.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Descuento</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {reglas.map((r) => (
                <tr key={r.id} className="border-b border-subtle/50">
                  <td className="px-4 py-2">{r.categoriaNombre}</td>
                  <td className="px-4 py-2">{r.nombre}</td>
                  <td className="px-4 py-2 tabular">
                    {formatearValor(r.tipo, r.valor)}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tono={r.activo ? "pitch" : "alerta"}>
                      {r.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditando(r)}
                        className="text-xs font-semibold text-muted hover:text-brand"
                      >
                        Editar
                      </button>
                      {r.activo && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAsignando(r)}
                            className="text-xs font-semibold text-muted hover:text-brand"
                          >
                            Jugadores
                          </button>
                          <Desactivar reglaId={r.id} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editando && (
        <EditarDescuentoReglaModal
          regla={editando}
          categorias={categorias}
          onClose={(cambio) => {
            setEditando(null);
            if (cambio) router.refresh();
          }}
        />
      )}

      {asignando && (
        <AsignarJugadoresDescuentoModal
          regla={asignando}
          jugadores={jugadores.filter((j) => j.categoriaId === asignando.categoriaId)}
          asignadosIniciales={asignacionesPorRegla[asignando.id] ?? []}
          onClose={(cambio) => {
            setAsignando(null);
            if (cambio) router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Baja lógica: la regla queda en la tabla como historial, no se borra. */
function Desactivar({ reglaId }: { reglaId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const fd = new FormData();
          fd.set("reglaId", reglaId);
          startTransition(async () => {
            const res = await desactivarDescuentoReglaAction(undefined, fd);
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
