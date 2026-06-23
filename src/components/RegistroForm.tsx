"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registrarConCodigoAction } from "@/actions/registro.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { POSICIONES } from "@/types";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-pitch";

export function RegistroForm({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    ActionResult<{ redirectTo: string }> | undefined,
    FormData
  >(registrarConCodigoAction, undefined);

  // Auto-login: tras crear la cuenta el padre ya queda con sesión; lo llevamos a su hub.
  useEffect(() => {
    if (!state?.ok || !state.data?.redirectTo) return;
    const destino = state.data.redirectTo;
    const t = setTimeout(() => {
      router.push(destino);
      router.refresh();
    }, 900);
    return () => clearTimeout(t);
  }, [state, router]);

  if (state?.ok) {
    return (
      <Card className="w-full max-w-md text-center">
        <h1 className="text-2xl font-black italic uppercase text-pitch">
          ¡Cuenta creada!
        </h1>
        <p className="mt-3 text-muted">
          Tu jugador/a quedó <b>pendiente</b> de aprobación del entrenador.
          Te llevamos a tu espacio…
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-pitch">
          Registro de familia
        </p>
        <h1 className="mt-1 text-2xl font-black italic uppercase">Crea tu cuenta</h1>
        <p className="mt-1 text-xs text-muted">
          Código de invitación: <span className="font-mono">{codigo}</span>
        </p>
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="codigo" value={codigo} />

        <p className="text-xs font-bold uppercase text-muted">Tus datos (tutor)</p>
        <Field name="padreNombre" label="Tu nombre" />
        <Field name="padreEmail" label="Email" type="email" />
        <Field name="password" label="Contraseña (mín. 8)" type="password" />

        <p className="pt-2 text-xs font-bold uppercase text-muted">
          Datos del jugador
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field name="jugadorNombre" label="Nombre" />
          <Field name="jugadorApellido" label="Apellido" />
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

        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Registrando…" : "Crear cuenta"}
        </Button>
      </form>
    </Card>
  );
}

function Field({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <input id={name} name={name} type={type} required className={input} />
    </div>
  );
}
