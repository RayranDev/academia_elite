"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, type ActionResult } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch";

export function LoginForm({ expirada = false }: { expirada?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(login, undefined);

  useEffect(() => {
    if (state?.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-pitch">
            Fútbol Career Mode
          </p>
          <h1 className="mt-1 text-2xl font-black italic uppercase">
            Iniciar sesión
          </h1>
        </div>

        {expirada && (
          <p className="mb-4 rounded-lg border border-info/40 bg-info/10 px-3 py-2 text-sm text-info">
            Tu sesión expiró o ya no es válida. Inicia sesión de nuevo.
          </p>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-muted">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className={input} />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-muted">
              Contraseña
            </label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
          </div>

          {state && !state.ok && (
            <p className="text-sm text-alerta" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
