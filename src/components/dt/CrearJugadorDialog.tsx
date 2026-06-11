"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearJugadorAction } from "@/actions/dt.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { POSICIONES } from "@/types";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function CrearJugadorDialog({
  categorias,
}: {
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await crearJugadorAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={categorias.length === 0}>
        + Nuevo jugador
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo jugador">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field name="nombre" label="Nombre" />
            <Field name="apellido" label="Apellido" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field name="fechaNacimiento" label="Nacimiento" type="date" />
            <div>
              <label className="mb-1 block text-xs text-muted">Posición</label>
              <select name="posicion" className={input}>
                {POSICIONES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Categoría</label>
              <select name="categoriaId" className={input}>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Field name="dorsal" label="Dorsal (opcional)" type="number" required={false} />
          </div>
          {error && (
            <p className="text-sm text-alerta" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Creando…" : "Crear jugador"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <input id={name} name={name} type={type} required={required} className={input} />
    </div>
  );
}
