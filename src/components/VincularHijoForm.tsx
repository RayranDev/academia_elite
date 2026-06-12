"use client";

import { useActionState } from "react";
import Link from "next/link";
import { vincularHijoAction } from "@/actions/registro.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-pitch";

/**
 * Registro del padre que se vincula a un hijo YA creado por la escuela, con el
 * código de escuela y el código de jugador. Si los datos son incorrectos o el
 * jugador ya tiene un padre, no se crea ninguna cuenta y se avisa.
 */
export function VincularHijoForm() {
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(vincularHijoAction, undefined);

  if (state?.ok) {
    return (
      <Card className="w-full max-w-md text-center">
        <h1 className="text-2xl font-black italic uppercase text-pitch">
          ¡Cuenta vinculada!
        </h1>
        <p className="mt-3 text-muted">
          Tu cuenta quedó asociada al perfil de tu hijo/a. Inicia sesión para ver
          su carta y sus estadísticas.
        </p>
        <Link href="/login" className="mt-5 inline-block">
          <Button>Ir a iniciar sesión</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-pitch">
          Soy el padre / tutor
        </p>
        <h1 className="mt-1 text-2xl font-black italic uppercase">Vincular a mi hijo</h1>
        <p className="mt-1 text-xs text-muted">
          Pide a la escuela el <b>código de escuela</b> y el <b>código del
          jugador</b> de tu hijo/a.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field name="codigoEscuela" label="Código de escuela" />
          <Field name="codigoJugador" label="Código del jugador" />
        </div>

        <p className="pt-2 text-xs font-bold uppercase text-muted">Tus datos (tutor)</p>
        <Field name="padreNombre" label="Tu nombre" />
        <Field name="padreEmail" label="Email" type="email" />
        <Field name="password" label="Contraseña (mín. 8)" type="password" />

        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Vinculando…" : "Vincular y crear cuenta"}
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
