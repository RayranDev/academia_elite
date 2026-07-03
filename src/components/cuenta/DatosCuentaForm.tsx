"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  actualizarMiNombreAction,
  solicitarCambioEmailAction,
  confirmarCambioEmailAction,
} from "@/actions/cuenta.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

type Aviso = { ok: boolean; texto: string } | null;
type PasoEmail = "idle" | "nuevo" | "codigo";

/**
 * Autoservicio de "Mi cuenta" (JUGADOR / DT): editar el nombre y cambiar el
 * correo. El correo exige confirmar un código enviado al correo NUEVO (prueba de
 * posesión); no cambia hasta confirmarlo. Los valores llegan del servidor.
 */
export function DatosCuentaForm({
  nombre: nombreInicial,
  email: emailInicial,
  emailVerificado,
}: {
  nombre: string;
  email: string;
  emailVerificado: boolean;
}) {
  const [pending, startTransition] = useTransition();

  // --- Nombre ---
  const [nombre, setNombre] = useState(nombreInicial);
  const [nombreMsg, setNombreMsg] = useState<Aviso>(null);

  function guardarNombre(e: FormEvent) {
    e.preventDefault();
    setNombreMsg(null);
    const fd = new FormData();
    fd.set("nombre", nombre);
    startTransition(async () => {
      const res = await actualizarMiNombreAction(undefined, fd);
      setNombreMsg(
        res.ok
          ? { ok: true, texto: "Nombre actualizado." }
          : { ok: false, texto: res.error },
      );
    });
  }

  // --- Email ---
  const [emailActual, setEmailActual] = useState(emailInicial);
  const [paso, setPaso] = useState<PasoEmail>("idle");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [emailMsg, setEmailMsg] = useState<Aviso>(null);

  function enviarCodigo(e: FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    const fd = new FormData();
    fd.set("email", nuevoEmail);
    startTransition(async () => {
      const res = await solicitarCambioEmailAction(undefined, fd);
      if (res.ok) setPaso("codigo");
      else setEmailMsg({ ok: false, texto: res.error });
    });
  }

  function confirmar(e: FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    const fd = new FormData();
    fd.set("codigo", codigo);
    startTransition(async () => {
      const res = await confirmarCambioEmailAction(undefined, fd);
      if (res.ok) {
        if (res.data) setEmailActual(res.data.email);
        reiniciarEmail();
        setEmailMsg({ ok: true, texto: "Correo actualizado." });
      } else {
        setEmailMsg({ ok: false, texto: res.error });
      }
    });
  }

  function reiniciarEmail() {
    setPaso("idle");
    setNuevoEmail("");
    setCodigo("");
  }

  return (
    <Card className="max-w-md space-y-6">
      <form onSubmit={guardarNombre} className="space-y-3">
        <div>
          <h2 className="mb-3 text-lg font-bold">Datos de la cuenta</h2>
          <label htmlFor="nombre" className="mb-1 block text-xs text-muted">
            Nombre
          </label>
          <input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            className={input}
          />
        </div>
        {nombreMsg && (
          <p
            className={`text-sm ${nombreMsg.ok ? "text-brand" : "text-alerta"}`}
            role="alert"
          >
            {nombreMsg.texto}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar nombre"}
        </Button>
      </form>

      <div className="space-y-2 border-t border-subtle pt-4">
        <span className="block text-xs text-muted">Correo</span>

        {paso === "idle" && (
          <>
            <p className="text-sm">
              {emailActual}
              {!emailVerificado && (
                <span className="ml-2 text-xs text-alerta">(sin verificar)</span>
              )}
            </p>
            {emailMsg?.ok && <p className="text-sm text-brand">{emailMsg.texto}</p>}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEmailMsg(null);
                setPaso("nuevo");
              }}
              disabled={pending}
            >
              Cambiar correo
            </Button>
          </>
        )}

        {paso === "nuevo" && (
          <form onSubmit={enviarCodigo} className="space-y-2">
            <p className="text-xs text-muted">
              Te enviaremos un código al correo nuevo para confirmar que es tuyo.
              Tu correo actual sigue válido hasta que lo confirmes.
            </p>
            <input
              type="email"
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
              required
              placeholder="nuevo@correo.com"
              autoComplete="email"
              className={input}
            />
            {emailMsg && !emailMsg.ok && (
              <p className="text-sm text-alerta" role="alert">
                {emailMsg.texto}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Enviando…" : "Enviar código"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={reiniciarEmail}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {paso === "codigo" && (
          <form onSubmit={confirmar} className="space-y-2">
            <p className="text-xs text-muted">
              Ingresá el código de 6 dígitos que enviamos a{" "}
              <strong>{nuevoEmail}</strong>.
            </p>
            <input
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              required
              placeholder="123456"
              className={input}
            />
            {emailMsg && !emailMsg.ok && (
              <p className="text-sm text-alerta" role="alert">
                {emailMsg.texto}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Confirmando…" : "Confirmar correo"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={reiniciarEmail}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
