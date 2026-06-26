"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { verificarEmailAction } from "@/actions/recuperacion.actions";
import { Card } from "@/components/ui/Card";

type Estado = "cargando" | "ok" | "error";

export function VerificarEmail({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const corrido = useRef(false);

  useEffect(() => {
    if (corrido.current) return; // una sola vez (el token es de un solo uso)
    corrido.current = true;
    verificarEmailAction(token).then((r) => setEstado(r.ok ? "ok" : "error"));
  }, [token]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-pitch">
          Academia Elite
        </p>
        <h1 className="mt-1 mb-4 text-2xl font-display italic uppercase">
          Verificar correo
        </h1>

        {estado === "cargando" && (
          <p className="text-sm text-muted">Confirmando tu correo…</p>
        )}

        {estado === "ok" && (
          <p className="rounded-lg border border-pitch/40 bg-pitch/10 px-3 py-3 text-sm text-pitch">
            ¡Listo! Tu correo quedó verificado. ✅
          </p>
        )}

        {estado === "error" && (
          <p className="rounded-lg border border-subtle bg-surface-2 px-3 py-3 text-sm text-muted">
            El enlace no es válido o ya venció. Puede que tu correo ya esté
            verificado.
          </p>
        )}

        <div className="mt-5">
          <Link
            href="/jugador"
            className="text-sm font-semibold text-pitch hover:underline"
          >
            Ir a mi cuenta
          </Link>
        </div>
      </Card>
    </main>
  );
}
