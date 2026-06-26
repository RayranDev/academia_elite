"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  solicitarOtpAction,
  ingresarConOtpAction,
  type OtpResult,
} from "@/actions/otp.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch";

export function OtpLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const [pedir, accionPedir, pidiendo] = useActionState<
    OtpResult | undefined,
    FormData
  >(solicitarOtpAction, undefined);

  const [entrar, accionEntrar, entrando] = useActionState<
    OtpResult | undefined,
    FormData
  >(ingresarConOtpAction, undefined);

  // El paso se DERIVA del estado: si ya se pidió el código, mostramos el paso de
  // ingresarlo (evita setState dentro de un efecto).
  const paso: "email" | "codigo" = pedir?.ok ? "codigo" : "email";

  // Tras entrar, navegamos al panel.
  useEffect(() => {
    if (entrar?.ok && entrar.redirectTo) {
      router.push(entrar.redirectTo);
      router.refresh();
    }
  }, [entrar, router]);

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
            Entrar con código
          </h1>
        </div>

        {paso === "email" ? (
          <form action={accionPedir} className="space-y-4">
            <p className="text-sm text-muted">
              Te enviamos un código de 6 dígitos a tu correo para entrar sin
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={pidiendo}>
              {pidiendo ? "Enviando…" : "Enviarme el código"}
            </Button>
          </form>
        ) : (
          <form action={accionEntrar} className="space-y-4">
            <p className="text-sm text-muted">
              Si el correo está registrado, te llegó un código. Ingresalo abajo
              (vence en 10 minutos).
            </p>
            <input type="hidden" name="email" value={email} />
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
                required
                maxLength={6}
                className={`${input} text-center text-2xl tracking-[0.5em]`}
              />
            </div>

            {entrar && !entrar.ok && (
              <p className="text-sm text-alerta" role="alert">
                {entrar.error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={entrando}>
              {entrando ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
