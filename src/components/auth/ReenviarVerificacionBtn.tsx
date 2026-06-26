"use client";

import { useState, useTransition } from "react";
import { reenviarVerificacionAction } from "@/actions/recuperacion.actions";

export function ReenviarVerificacionBtn() {
  const [enviando, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);

  if (enviado) {
    return <span className="text-xs text-pitch">Correo reenviado ✅</span>;
  }

  return (
    <button
      type="button"
      disabled={enviando}
      onClick={() =>
        startTransition(async () => {
          const res = await reenviarVerificacionAction();
          if (res.ok) setEnviado(true);
        })
      }
      className="text-xs font-semibold text-pitch underline-offset-2 hover:underline disabled:opacity-60"
    >
      {enviando ? "Reenviando…" : "Reenviar correo de verificación"}
    </button>
  );
}
