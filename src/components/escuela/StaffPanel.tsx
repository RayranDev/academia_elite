"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearStaffAction, eliminarStaffAction } from "@/actions/staff.actions";
import { CARGOS_STAFF, etiquetaCargoStaff } from "@/lib/validators/staff";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EditarStaffModal } from "@/components/escuela/EditarStaffModal";
import type { StaffDTO } from "@/services/staff.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function StaffPanel({ staff }: { staff: StaffDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<StaffDTO | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await crearStaffAction(undefined, fd);
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
        <h2 className="mb-3 text-lg font-bold">Nuevo integrante</h2>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="cargo">
              Cargo
            </label>
            <select id="cargo" name="cargo" defaultValue={CARGOS_STAFF[0]} className={input}>
              {CARGOS_STAFF.map((c) => (
                <option key={c} value={c}>{etiquetaCargoStaff(c)}</option>
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
              maxLength={80}
              required
              placeholder="Nombre y apellido"
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="telefono">
              Teléfono
            </label>
            <input id="telefono" name="telefono" type="text" maxLength={30} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className={input} />
          </div>
          <div className="flex items-end sm:col-span-4">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Guardando…" : "Agregar"}
            </Button>
          </div>
        </form>
        {error && (
          <p className="mt-2 text-sm text-alerta" role="alert">{error}</p>
        )}
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="p-4 text-lg font-bold">Staff</h2>
        {staff.length === 0 ? (
          <p className="p-4 pt-0 text-sm text-muted">
            Sin integrantes cargados todavía.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-subtle text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Cargo</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Contacto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-subtle/50">
                  <td className="px-4 py-2">{etiquetaCargoStaff(s.cargo)}</td>
                  <td className="px-4 py-2">{s.nombre}</td>
                  <td className="px-4 py-2 text-muted">
                    {s.telefono ?? s.email ? (
                      <span>
                        {s.telefono}
                        {s.telefono && s.email ? " · " : ""}
                        {s.email}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditando(s)}
                        className="text-xs font-semibold text-muted hover:text-brand"
                      >
                        Editar
                      </button>
                      <Eliminar staffId={s.id} nombre={s.nombre} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editando && (
        <EditarStaffModal
          staff={editando}
          onClose={(cambio) => {
            setEditando(null);
            if (cambio) router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Borrado físico (sin baja lógica): confirmación simple antes de eliminar. */
function Eliminar({ staffId, nombre }: { staffId: string; nombre: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`¿Eliminar a ${nombre} del staff?`)) return;
          const fd = new FormData();
          fd.set("staffId", staffId);
          startTransition(async () => {
            const res = await eliminarStaffAction(undefined, fd);
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
        {pending ? "…" : "Eliminar"}
      </button>
      {error && (
        <p className="text-xs text-alerta" role="alert">{error}</p>
      )}
    </div>
  );
}
