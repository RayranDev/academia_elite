"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { recuperarPasswordAction } from "@/actions/recuperacion.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch";

export function RecuperarForm() {
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(recuperarPasswordAction, undefined);

  const enviado = state?.ok === true;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Volver al login
        </Link>

        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-pitch">
            Academia Elite
          </p>
          <h1 className="mt-1 text-2xl font-display italic uppercase">
            Recuperar acceso
          </h1>
        </div>

        {enviado ? (
          <p className="rounded-lg border border-pitch/40 bg-pitch/10 px-3 py-3 text-sm text-pitch">
            Si el correo está registrado, te enviamos un enlace para crear una
            contraseña nueva. Revisá tu bandeja (y el spam).
          </p>
        ) : (
          <form action={action} className="space-y-4">
            <p className="text-sm text-muted">
              Ingresá tu correo y te enviamos un enlace para restablecer la
              contraseña.
            </p>
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-muted"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={input}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Enviando…" : "Enviar enlace"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
