"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { login, type ActionResult } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch";

export function LoginForm({ expirada = false }: { expirada?: boolean }) {
  const router = useRouter();
  const [verPass, setVerPass] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(login, undefined);

  const entrando = state?.ok === true;

  // Tras un login correcto, deja ver la animación de entrada y navega al panel.
  useEffect(() => {
    if (!state?.ok || !state.redirectTo) return;
    const destino = state.redirectTo;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => {
        router.push(destino);
        router.refresh();
      },
      reduce ? 0 : 1100,
    );
    return () => clearTimeout(t);
  }, [state, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Volver al inicio
        </Link>

        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-pitch">
            Academia Elite
          </p>
          <h1 className="mt-1 text-2xl font-display italic uppercase">
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
            <div className="relative">
              <input
                id="password"
                name="password"
                type={verPass ? "text" : "password"}
                autoComplete="current-password"
                required
                className={`${input} pr-10`}
              />
              <button
                type="button"
                onClick={() => setVerPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {verPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {state && !state.ok && (
            <p className="text-sm text-alerta" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending || entrando}>
            {pending ? "Entrando…" : entrando ? "¡Adelante!" : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/recuperar" className="text-muted hover:text-foreground">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        <p className="mt-1 text-center text-sm">
          <Link href="/codigo" className="text-muted hover:text-foreground">
            Entrar con un código por correo
          </Link>
        </p>

        <p className="mt-5 text-center text-sm text-muted">
          ¿Eres familia y aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-pitch hover:underline">
            Regístrate
          </Link>
        </p>
      </Card>

      {entrando && <LoginTransition />}
    </main>
  );
}

/** Overlay breve de "entrada al estadio" mientras se redirige al panel. */
function LoginTransition() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base">
      <div className="flex flex-col items-center gap-4">
        <div className="login-ball h-16 w-16 rounded-full border-4 border-pitch border-t-transparent" />
        <p className="text-sm font-bold uppercase tracking-widest text-pitch">
          Entrando al estadio…
        </p>
      </div>
    </div>
  );
}
