"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import {
  recuperarPasswordAction,
  fijarPasswordAction,
} from "@/actions/recuperacion.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch";

/**
 * Recuperación y activación de cuenta en dos pasos con CÓDIGO (no enlace):
 * 1) pedir el código al correo; 2) ingresar código + contraseña nueva.
 * `directoACodigo` (activación) arranca en el paso 2 con el correo precargado:
 * el código ya se envió al crear la cuenta.
 */
export function RecuperarForm({
  initialEmail = "",
  directoACodigo = false,
}: {
  initialEmail?: string;
  directoACodigo?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paso, setPaso] = useState<"email" | "codigo">(
    directoACodigo ? "codigo" : "email",
  );
  const [email, setEmail] = useState(initialEmail);
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(() => router.push("/login"), 1800);
    return () => clearTimeout(t);
  }, [listo, router]);

  function pedirCodigo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      // Respuesta siempre genérica (anti-enumeración): pasamos al paso 2 igual.
      await recuperarPasswordAction(undefined, fd);
      setCodigoEnviado(true);
      setPaso("codigo");
    });
  }

  function reenviar() {
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      await recuperarPasswordAction(undefined, fd);
      setCodigoEnviado(true);
    });
  }

  function confirmar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("email", email);
    startTransition(async () => {
      const res = await fijarPasswordAction(undefined, fd);
      if (res.ok) setListo(true);
      else setError(res.error);
    });
  }

  const titulo = directoACodigo ? "Activá tu cuenta" : "Recuperar acceso";

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
            {titulo}
          </h1>
        </div>

        {listo ? (
          <div className="space-y-3 text-center">
            <p className="rounded-lg border border-pitch/40 bg-pitch/10 px-3 py-3 text-sm text-pitch">
              ¡Listo! Tu contraseña quedó guardada. Te llevamos al login…
            </p>
            <Link
              href="/login"
              className="text-sm font-semibold text-pitch hover:underline"
            >
              Ir al login ahora
            </Link>
          </div>
        ) : paso === "email" ? (
          <form onSubmit={pedirCodigo} className="space-y-4">
            <p className="text-sm text-muted">
              Ingresá tu correo y te enviamos un código para crear una contraseña
              nueva.
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Enviando…" : "Enviar código"}
            </Button>
          </form>
        ) : (
          <form onSubmit={confirmar} className="space-y-4">
            {codigoEnviado && (
              <p className="rounded-lg border border-pitch/40 bg-pitch/10 px-3 py-2 text-xs text-pitch">
                Si el correo está registrado, te enviamos un código. Revisá tu
                bandeja (y el spam).
              </p>
            )}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label
                htmlFor="codigo"
                className="mb-1 block text-sm font-medium text-muted"
              >
                Código de 6 dígitos
              </label>
              <input
                id="codigo"
                name="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                placeholder="123456"
                className={input}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-muted"
              >
                Contraseña nueva (mínimo 8 caracteres)
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

            {error && (
              <p className="text-sm text-alerta" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Guardando…" : "Guardar contraseña"}
            </Button>

            <button
              type="button"
              onClick={reenviar}
              disabled={pending}
              className="w-full text-center text-xs font-semibold text-pitch hover:underline disabled:opacity-60"
            >
              Reenviar código
            </button>
          </form>
        )}
      </Card>
    </main>
  );
}
