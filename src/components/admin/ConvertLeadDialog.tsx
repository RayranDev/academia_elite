"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { convertirLeadAction } from "@/actions/admin.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action-result";

type ConvertData = { adminEmail: string; passwordTemporal: string };

const campo =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-pitch";

function slugSugerido(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function ConvertLeadDialog({
  leadId,
  nombreEscuela,
  contactoNombre,
  contactoEmail,
}: {
  leadId: string;
  nombreEscuela: string;
  contactoNombre: string;
  contactoEmail: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult<ConvertData> | undefined,
    FormData
  >(convertirLeadAction, undefined);

  const exito = state?.ok ? state.data : undefined;

  return (
    <>
      <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
        Convertir → escuela
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          if (exito) router.refresh();
        }}
        title="Convertir lead en escuela"
      >
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
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
                router.refresh();
              }}
            >
              Listo
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="leadId" value={leadId} />
            <Field
              name="nombreEscuela"
              label="Nombre de la escuela"
              defaultValue={nombreEscuela}
            />
            <Field
              name="slug"
              label="Slug (identificador único)"
              defaultValue={slugSugerido(nombreEscuela)}
            />
            <Field
              name="adminNombre"
              label="Nombre del administrador"
              defaultValue={contactoNombre}
            />
            <Field
              name="adminEmail"
              label="Email del administrador"
              type="email"
              defaultValue={contactoEmail}
            />
            {state && !state.ok && (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? "Creando…" : "Crear escuela"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        className={campo}
      />
    </div>
  );
}
