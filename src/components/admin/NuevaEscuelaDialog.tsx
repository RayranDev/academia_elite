"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { crearEscuelaAction } from "@/actions/admin.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";

type CrearData = { adminEmail: string; passwordTemporal: string };

const campo =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-pitch";

/** Sugerencia de slug a partir del nombre (a-z, 0-9 y guiones). */
function slugSugerido(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Alta directa de una escuela con su administrador inicial (SUPER_ADMIN). */
export function NuevaEscuelaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult<CrearData> | undefined,
    FormData
  >(crearEscuelaAction, undefined);

  const exito = state?.ok ? state.data : undefined;

  function cambiarNombre(v: string) {
    setNombre(v);
    if (!slugEditado) setSlug(slugSugerido(v));
  }

  function cerrar() {
    setOpen(false);
    if (exito) router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nueva escuela
      </Button>

      <Modal open={open} onClose={cerrar} title="Nueva escuela">
        {exito ? (
          <div className="space-y-4">
            <p className="text-sm text-pitch">
              ✅ Escuela creada con su administrador.
            </p>
            <div className="rounded-lg border border-subtle bg-surface-2 p-4 text-sm">
              <p className="text-muted">Email del admin</p>
              <p className="font-mono font-semibold">{exito.adminEmail}</p>
              <p className="mt-3 text-muted">Contraseña temporal</p>
              <p className="select-all font-mono text-lg font-bold text-pitch">
                {exito.passwordTemporal}
              </p>
              <p className="mt-3 text-xs text-alerta">
                Cópiala ahora y compártela por un canal seguro. No se volverá a
                mostrar.
              </p>
            </div>
            <Button className="w-full" onClick={cerrar}>
              Listo
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <div>
              <label htmlFor="ne-nombre" className="mb-1 block text-xs text-muted">
                Nombre de la escuela
              </label>
              <input
                id="ne-nombre"
                name="nombreEscuela"
                required
                value={nombre}
                onChange={(e) => cambiarNombre(e.target.value)}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="ne-slug" className="mb-1 block text-xs text-muted">
                Slug (identificador único)
              </label>
              <input
                id="ne-slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEditado(true);
                }}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="ne-admin" className="mb-1 block text-xs text-muted">
                Nombre del administrador
              </label>
              <input id="ne-admin" name="adminNombre" required className={campo} />
            </div>
            <div>
              <label htmlFor="ne-email" className="mb-1 block text-xs text-muted">
                Email del administrador
              </label>
              <input
                id="ne-email"
                name="adminEmail"
                type="email"
                required
                className={campo}
              />
            </div>
            {state && !state.ok && (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? "Creando…" : "Crear escuela"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
