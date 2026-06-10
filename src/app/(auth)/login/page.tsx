"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, type ActionResult } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
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

        <form action={action} className="space-y-4">
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
              className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-muted"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch"
            />
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
