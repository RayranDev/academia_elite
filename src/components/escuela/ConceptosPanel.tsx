"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearConceptoAction,
  editarConceptoAction,
  borrarConceptoAction,
} from "@/actions/concepto-cobro.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ActionResult } from "@/lib/action-result";
import type { ConceptoCobroConUsoDTO } from "@/services/concepto-cobro.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function ConceptosPanel({
  conceptos,
}: {
  conceptos: ConceptoCobroConUsoDTO[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // `ActionResult` completo y no `{ ok: boolean }`: es una unión discriminada
  // (§5), así que al estrechar por `res.ok` el `error` viene tipado como string
  // y no hace falta un fallback que nunca se ejecuta.
  function ejecutar(
    accion: (fd: FormData) => Promise<ActionResult>,
    fd: FormData,
    alTerminar?: () => void,
  ) {
    startTransition(async () => {
      const res = await accion(fd);
      if (res.ok) {
        setError(null);
        alTerminar?.();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-bold">Agregar concepto</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            ejecutar(
              (fd) => crearConceptoAction(undefined, fd),
              new FormData(form),
              () => form.reset(),
            );
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs text-muted" htmlFor="nombre-concepto">
              Nombre
            </label>
            <input
              id="nombre-concepto"
              name="nombre"
              maxLength={40}
              required
              placeholder="Torneo Bogotá 2026"
              className={input}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Agregar"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-alerta">
            {error}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Catálogo</h2>
        {/* El mismo error se muestra también acá. Archivar, borrar y renombrar
            se disparan desde esta tabla, y con un catálogo largo el aviso de la
            tarjeta de arriba quedaba fuera de pantalla: el usuario hacía clic en
            Borrar, no pasaba nada visible y no había forma de saber por qué. */}
        {error && (
          <p role="alert" className="mb-3 text-sm text-alerta">
            {error}
          </p>
        )}
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-subtle text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Origen</th>
              <th className="px-4 py-2">En uso</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {conceptos.map((c) => {
              const enUso = c.cuotas > 0 || c.aranceles > 0;
              return (
                <tr key={c.id} className="border-b border-subtle/50">
                  <td className="px-4 py-2">
                    {editandoId === c.id ? (
                      <form
                        id={`editar-${c.id}`}
                        onSubmit={(e) => {
                          e.preventDefault();
                          ejecutar(
                            (fd) => editarConceptoAction(undefined, fd),
                            new FormData(e.currentTarget),
                            () => setEditandoId(null),
                          );
                        }}
                      >
                        <input type="hidden" name="id" value={c.id} />
                        {/* Solo viaja cuando queda activo: un checkbox
                            desmarcado no se manda, y esa ausencia ES el false. */}
                        {c.activo && <input type="hidden" name="activo" value="true" />}
                        <input
                          name="nombre"
                          aria-label={`Nuevo nombre para ${c.nombre}`}
                          defaultValue={c.nombre}
                          maxLength={40}
                          required
                          autoFocus
                          className={input}
                        />
                      </form>
                    ) : (
                      c.nombre
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {c.esSistema ? "Plataforma" : "Propio"}
                  </td>
                  <td className="px-4 py-2 text-muted tabular">
                    {enUso ? `${c.cuotas} cuotas · ${c.aranceles} precios` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tono={c.activo ? "pitch" : "alerta"}>
                      {c.activo ? "Activo" : "Archivado"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      {editandoId === c.id ? (
                        <>
                          <button
                            type="submit"
                            form={`editar-${c.id}`}
                            disabled={pending}
                            className="text-xs font-semibold text-brand"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="text-xs text-muted hover:text-foreground"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditandoId(c.id)}
                          className="text-xs font-semibold text-muted hover:text-brand"
                        >
                          Renombrar
                        </button>
                      )}

                      {/* Archivar es la baja normal. Los de plataforma no se
                          archivan: sin mensualidad no hay cobranza masiva. */}
                      {!c.esSistema && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("id", c.id);
                            fd.set("nombre", c.nombre);
                            if (!c.activo) fd.set("activo", "true");
                            ejecutar((f) => editarConceptoAction(undefined, f), fd);
                          }}
                          className="text-xs font-semibold text-muted hover:text-brand"
                        >
                          {c.activo ? "Archivar" : "Reactivar"}
                        </button>
                      )}

                      {/* Borrar de verdad solo lo que nunca se usó: con cuotas
                          encima, borrarlo dejaría huérfano el historial. */}
                      {!c.esSistema && !enUso && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (!window.confirm(`¿Borrar "${c.nombre}"?`)) return;
                            const fd = new FormData();
                            fd.set("conceptoId", c.id);
                            ejecutar((f) => borrarConceptoAction(undefined, f), fd);
                          }}
                          className="text-xs font-semibold text-alerta hover:underline"
                        >
                          Borrar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
