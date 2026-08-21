"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearArancelAction,
  desactivarArancelAction,
} from "@/actions/arancel.actions";
import { ConceptoSelect } from "@/components/escuela/ConceptoSelect";
import type { ConceptoCobroDTO } from "@/services/concepto-cobro.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FechaCalendario } from "@/components/ui/FechaCalendario";
import { diaDeISO, hoyISO } from "@/lib/fecha-calendario";
import { formatearMonto } from "@/lib/cobranza";
import { EditarArancelModal } from "@/components/escuela/EditarArancelModal";
import type { ArancelDTO } from "@/services/arancel.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function ArancelesPanel({
  aranceles,
  categorias,
  conceptos,
}: {
  aranceles: ArancelDTO[];
  categorias: { id: string; nombre: string }[];
  conceptos: ConceptoCobroDTO[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<ArancelDTO | null>(null);

  // El alta va por onSubmit (no `action={formAction}` de useActionState) porque
  // antes de crear necesitamos poder CANCELAR el envío entero: si ya hay un
  // precio activo con la misma categoría+concepto, se le pregunta al usuario si
  // quiere reemplazarlo (window.confirm) y, si cancela, el form no se manda.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const categoriaId = (fd.get("categoriaId") as string) || null;
    const conceptoId = fd.get("conceptoId") as string;

    // Un precio con fecha FUTURA es un aumento programado, no un reemplazo:
    // `resolverArancel` lo ignora hasta que llega su fecha. Ofrecer reemplazar
    // ahí desactivaba el precio HOY vigente, y `listarArancelesActivos` filtra
    // por `activo`, así que la escuela quedaba sin ningún precio aplicable y el
    // mes entero se emitía sin monto — justo lo contrario de lo que quiso hacer.
    const vigenteDesde = (fd.get("vigenteDesde") as string) || "";
    const esProgramado = vigenteDesde !== "" && vigenteDesde > hoyISO();

    const duplicado = esProgramado
      ? undefined
      : aranceles.find(
          (a) => a.activo && a.categoriaId === categoriaId && a.conceptoId === conceptoId,
        );
    if (duplicado) {
      // Mismo motivo que en la tabla: `vigenteDesde` es un día de almanaque, y
      // pasarlo por la zona del navegador lo corre un día para atrás.
      const fecha = diaDeISO(duplicado.vigenteDesde);
      const confirmar = window.confirm(
        `Ya hay un precio activo de ${duplicado.conceptoNombre} para ` +
          `${duplicado.categoriaNombre}: ${formatearMonto(duplicado.monto)} ` +
          `(rige desde ${fecha}). ¿Darlo de baja y reemplazarlo por el nuevo?`,
      );
      if (!confirmar) return;
      fd.set("reemplazarId", duplicado.id);
    }

    startTransition(async () => {
      const res = await crearArancelAction(undefined, fd);
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
        <h2 className="mb-3 text-lg font-bold">Agregar precio</h2>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
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
            <ConceptoSelect id="concepto" conceptos={conceptos} className={input} />
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
          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs text-muted" htmlFor="descripcion">
              Descripción (opcional)
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={2}
              maxLength={200}
              placeholder="Útil sobre todo para el concepto Otro, para saber después de qué se trataba."
              className={input}
            />
          </div>
          <div className="flex items-end sm:col-span-4">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Guardando…" : "Agregar precio"}
            </Button>
          </div>
        </form>
        {error && (
          <p className="mt-2 text-sm text-alerta" role="alert">{error}</p>
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
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Rige desde</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {aranceles.map((a) => (
                <tr key={a.id} className="border-b border-subtle/50">
                  <td className="px-4 py-2">{a.categoriaNombre}</td>
                  <td className="px-4 py-2 text-muted">{a.conceptoNombre}</td>
                  <td className="px-4 py-2 tabular">{formatearMonto(a.monto)}</td>
                  <td className="px-4 py-2 text-muted">{a.descripcion ?? "—"}</td>
                  <td className="px-4 py-2 text-muted">
                    {/* Día de almanaque, no instante (AGENTS.md §6): entra por
                        un <input type="date"> y se guarda a medianoche UTC.
                        Con <FechaLocal/> en Colombia se leía un día menos que
                        el cargado — y distinto de lo que muestra el modal de
                        edición, que ya cortaba el ISO. */}
                    <FechaCalendario iso={a.vigenteDesde} formato="d MMM yyyy" />
                  </td>
                  <td className="px-4 py-2">
                    <Badge tono={a.activo ? "pitch" : "alerta"}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditando(a)}
                        className="text-xs font-semibold text-muted hover:text-brand"
                      >
                        Editar
                      </button>
                      {a.activo && <Desactivar arancelId={a.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editando && (
        <EditarArancelModal
          arancel={editando}
          categorias={categorias}
          conceptos={conceptos}
          onClose={(cambio) => {
            setEditando(null);
            if (cambio) router.refresh();
          }}
        />
      )}
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
