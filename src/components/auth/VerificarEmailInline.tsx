"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  verificarMiEmailAction,
  reenviarVerificacionAction,
} from "@/actions/recuperacion.actions";

/**
 * Verificación de correo del usuario logueado con CÓDIGO: pide el código a su
 * correo y lo ingresa acá. Reemplaza al enlace de verificación (un código no es
 * clickeable desde un buzón ajeno). Se usa en el aviso suave del panel.
 */
export function VerificarEmailInline() {
  const [pending, startTransition] = useTransition();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [verificado, setVerificado] = useState(false);

  if (verificado) {
    return <span className="text-xs font-semibold text-pitch">Correo verificado ✅</span>;
  }

  function confirmar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("codigo", codigo);
    startTransition(async () => {
      const res = await verificarMiEmailAction(undefined, fd);
      if (res.ok) setVerificado(true);
      else setError(res.error);
    });
  }

  function reenviar() {
    setError(null);
    startTransition(async () => {
      const res = await reenviarVerificacionAction();
      if (res.ok) setEnviado(true);
      else setError(res.error);
    });
  }

  return (
    <form
      onSubmit={confirmar}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        name="codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        placeholder="Código de 6 dígitos"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
        className="w-44 rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-pitch"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-pitch px-3 py-1.5 text-sm font-semibold text-base disabled:opacity-60"
      >
        {pending ? "Verificando…" : "Verificar"}
      </button>
      <button
        type="button"
        onClick={reenviar}
        disabled={pending}
        className="text-xs font-semibold text-pitch underline-offset-2 hover:underline disabled:opacity-60"
      >
        {enviado ? "Código reenviado ✅" : "Enviar código"}
      </button>
      {error && (
        <span className="text-xs text-alerta" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
