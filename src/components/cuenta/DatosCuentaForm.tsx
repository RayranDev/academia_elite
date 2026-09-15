"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  actualizarMisDatosAction,
  solicitarCambioEmailAction,
  confirmarCambioEmailAction,
} from "@/actions/cuenta.actions";
import { TIPOS_DOCUMENTO_FISCAL } from "@/lib/validators/cuenta";
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
  telefono: telefonoInicial,
  emailVerificado,
  tipoDocumento: tipoDocumentoInicial,
  numeroDocumento: numeroDocumentoInicial,
  direccion: direccionInicial,
}: {
  nombre: string;
  email: string;
  telefono: string | null;
  emailVerificado: boolean;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  direccion: string | null;
}) {
  const [pending, startTransition] = useTransition();

  // --- Nombre + teléfono ---
  const [nombre, setNombre] = useState(nombreInicial);
  const [telefono, setTelefono] = useState(telefonoInicial ?? "");
  const [nombreMsg, setNombreMsg] = useState<Aviso>(null);

  // --- Identificación fiscal del acudiente (opcional, facturación futura) ---
  const [tipoDocumento, setTipoDocumento] = useState(tipoDocumentoInicial ?? "");
  const [numeroDocumento, setNumeroDocumento] = useState(
    numeroDocumentoInicial ?? "",
  );
  const [direccion, setDireccion] = useState(direccionInicial ?? "");

  function guardarDatos(e: FormEvent) {
    e.preventDefault();
    setNombreMsg(null);
    const fd = new FormData();
    fd.set("nombre", nombre);
    fd.set("telefono", telefono);
    fd.set("tipoDocumento", tipoDocumento);
    fd.set("numeroDocumento", numeroDocumento);
    fd.set("direccion", direccion);
    startTransition(async () => {
      const res = await actualizarMisDatosAction(undefined, fd);
      setNombreMsg(
        res.ok
          ? { ok: true, texto: "Datos actualizados." }
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
      <form onSubmit={guardarDatos} className="space-y-3">
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
        <div>
          <label htmlFor="telefono" className="mb-1 block text-xs text-muted">
            Teléfono de contacto (opcional)
          </label>
          <input
            id="telefono"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            maxLength={30}
            placeholder="+57 300 000 0000"
            autoComplete="tel"
            className={input}
          />
          <p className="mt-1 text-xs text-muted">
            Lo usa la escuela para la nómina y contacto de emergencia.
          </p>
        </div>
        <div className="border-t border-subtle pt-3">
          <p className="mb-2 text-xs text-muted">
            Datos de facturación (opcional). Solo si tu escuela emite factura
            electrónica — hoy no es obligatorio completarlos.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="tipoDocumento"
                className="mb-1 block text-xs text-muted"
              >
                Tipo de documento
              </label>
              <select
                id="tipoDocumento"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className={input}
              >
                <option value="">Sin especificar</option>
                {TIPOS_DOCUMENTO_FISCAL.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="numeroDocumento"
                className="mb-1 block text-xs text-muted"
              >
                Número de documento
              </label>
              <input
                id="numeroDocumento"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                maxLength={20}
                placeholder="900123456-7"
                className={input}
              />
            </div>
          </div>
          <div className="mt-2">
            <label htmlFor="direccion" className="mb-1 block text-xs text-muted">
              Dirección
            </label>
            <input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              maxLength={200}
              placeholder="Calle 10 # 20-30, Bogotá"
              autoComplete="street-address"
              className={input}
            />
          </div>
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
          {pending ? "Guardando…" : "Guardar datos"}
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
              Ingresa el código de 6 dígitos que enviamos a{" "}
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
