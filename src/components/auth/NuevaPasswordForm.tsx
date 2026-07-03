"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { fijarPasswordAction } from "@/actions/recuperacion.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch";

export function NuevaPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [verPass, setVerPass] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(fijarPasswordAction, undefined);

  const listo = state?.ok === true;

  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(() => router.push("/login"), 1800);
    return () => clearTimeout(t);
  }, [listo, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-pitch">
            Academia Elite
          </p>
          <h1 className="mt-1 text-2xl font-display italic uppercase">
            Nueva contraseña
          </h1>
        </div>

        {listo ? (
          <div className="space-y-3 text-center">
            <p className="rounded-lg border border-pitch/40 bg-pitch/10 px-3 py-3 text-sm text-pitch">
              ¡Listo! Tu contraseña quedó actualizada. Te llevamos al login…
            </p>
            <Link
              href="/login"
              className="text-sm font-semibold text-pitch hover:underline"
            >
              Ir al login ahora
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-muted"
              >
                Elegí una contraseña (mínimo 8 caracteres)
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={verPass ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className={`${input} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setVerPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmacion"
                className="mb-1 block text-sm font-medium text-muted"
              >
                Repetí la contraseña
              </label>
              <input
                id="confirmacion"
                name="confirmacion"
                type={verPass ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                className={input}
              />
            </div>

            {state && !state.ok && (
              <p className="text-sm text-alerta" role="alert">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
