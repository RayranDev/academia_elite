"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CredencialesBox } from "@/components/gestion/CredencialesBox";
import type { ActionResult } from "@/lib/action-result";

type Credenciales = { email: string; passwordTemporal: string };

/**
 * Botón genérico de "Resetear contraseña": confirma, llama a la Server Action
 * recibida por props y muestra la temporal una sola vez.
 */
export function ResetPasswordButton({
  action,
  campos,
  destinatario,
  size = "sm",
}: {
  action: (
    prev: ActionResult<Credenciales> | undefined,
    formData: FormData,
  ) => Promise<ActionResult<Credenciales>>;
  campos: Record<string, string>; // hidden fields (p. ej. { jugadorId })
  destinatario: string; // texto de confirmación ("la familia de Lucas…")
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [resultado, setResultado] = useState<Credenciales | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.set(k, v);
    startTransition(async () => {
      const res = await action(undefined, fd);
      if (res.ok && res.data) {
        setResultado(res.data);
        setError(null);
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function cerrar() {
    setOpen(false);
    setResultado(null);
    setError(null);
  }

  return (
    <>
      <Button variant="ghost" size={size} onClick={() => setOpen(true)}>
        <KeyRound className="mr-1 h-3.5 w-3.5" aria-hidden />
        Resetear contraseña
      </Button>

      <Modal open={open} onClose={cerrar} title="Resetear contraseña">
        {resultado ? (
          <div className="space-y-4">
            <CredencialesBox
              email={resultado.email}
              passwordTemporal={resultado.passwordTemporal}
            />
            <Button className="w-full" onClick={cerrar}>
              Listo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Se generará una contraseña temporal nueva para{" "}
              <span className="font-semibold text-foreground">{destinatario}</span>.
              La actual dejará de funcionar.
            </p>
            {error && (
              <p className="text-sm text-alerta" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={confirmar} disabled={pending}>
                {pending ? "Generando…" : "Generar temporal"}
              </Button>
              <Button variant="secondary" onClick={cerrar}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
