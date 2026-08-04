"use client";

import { useActionState, useEffect, useState } from "react";
import {
  obtenerFichaMedicaAction,
  actualizarFichaMedicaAction,
} from "@/actions/gestion.actions";
import { TIPOS_DOCUMENTO, TIPOS_RH } from "@/lib/validators/gestion";
import { PARENTESCOS } from "@/lib/validators/cuenta";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FechaLocal } from "@/components/ui/FechaLocal";
import type { ActionResult } from "@/lib/action-result";
import type { FichaMedicaEscuelaDTO } from "@/services/gestion-jugadores.service";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50";

/**
 * A diferencia de Editar/Estado/Bloqueo, este modal NO recibe los datos como
 * prop: los trae bajo demanda al abrirse (`obtenerFichaMedicaAction`). Son
 * datos sensibles y la lectura queda auditada — precargarlos con la lista
 * completa auditaría 20 filas por cada carga de página, sin que nadie las
 * haya abierto de verdad.
 */
export function FichaMedicaModal({
  jugadorId,
  nombreCompleto,
  onClose,
}: {
  jugadorId: string;
  nombreCompleto: string;
  onClose: (cambio: boolean) => void;
}) {
  const [ficha, setFicha] = useState<FichaMedicaEscuelaDTO | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [autorizaSalud, setAutorizaSalud] = useState(false);

  useEffect(() => {
    let cancelado = false;
    obtenerFichaMedicaAction(jugadorId).then((res) => {
      if (cancelado) return;
      if (res.ok && res.data) {
        setFicha(res.data);
        setAutorizaSalud(res.data.autorizaDatosSalud);
      } else if (!res.ok) {
        setErrorCarga(res.error);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [jugadorId]);

  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    async (_prev, fd) => {
      const res = await actualizarFichaMedicaAction(undefined, fd);
      // El refresh lo dispara `cerrarModal` (el padre), igual que en el resto
      // de los modales de esta lista — no duplicarlo acá.
      if (res.ok) onClose(true);
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={() => onClose(false)} title={`Ficha — ${nombreCompleto}`}>
      {errorCarga ? (
        <p className="text-sm text-alerta" role="alert">{errorCarga}</p>
      ) : !ficha ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : (
        <form action={action} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <input type="hidden" name="jugadorId" value={ficha.jugadorId} />

          <p className="text-xs text-muted">
            Opcional: la escuela funciona sin esta ficha. Los datos de salud
            (EPS, RH, alergias, condiciones, apto médico) exigen autorización
            específica de la familia — sin marcarla, no se guardan.
          </p>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold">Identificación</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="tipoDocumento">
                  Tipo de documento
                </label>
                <select
                  id="tipoDocumento"
                  name="tipoDocumento"
                  defaultValue={ficha.tipoDocumento ?? ""}
                  className={input}
                >
                  <option value="">— Sin especificar —</option>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="numeroDocumento">
                  Número de documento
                </label>
                <input
                  id="numeroDocumento"
                  name="numeroDocumento"
                  defaultValue={ficha.numeroDocumento ?? ""}
                  maxLength={30}
                  className={input}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 border-t border-subtle pt-3">
            <legend className="text-sm font-bold">Datos de salud</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="autorizaDatosSalud"
                checked={autorizaSalud}
                onChange={(e) => setAutorizaSalud(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Autorización de datos de salud.</span>{" "}
                Sin esta autorización, EPS, RH, alergias, condiciones y apto
                médico no se guardan aunque se completen abajo.
                {ficha.autorizacionDatosSaludEn && (
                  <span className="block text-xs text-muted">
                    Última autorización:{" "}
                    <FechaLocal iso={ficha.autorizacionDatosSaludEn} formato="d MMM yyyy" />
                  </span>
                )}
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="eps">
                  EPS
                </label>
                <input
                  id="eps"
                  name="eps"
                  defaultValue={ficha.eps ?? ""}
                  disabled={!autorizaSalud}
                  maxLength={80}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="rh">
                  RH
                </label>
                <select
                  id="rh"
                  name="rh"
                  defaultValue={ficha.rh ?? ""}
                  disabled={!autorizaSalud}
                  className={input}
                >
                  <option value="">— Sin especificar —</option>
                  {TIPOS_RH.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="aptoMedicoVence">
                  Apto médico vence
                </label>
                <input
                  id="aptoMedicoVence"
                  name="aptoMedicoVence"
                  type="date"
                  defaultValue={ficha.aptoMedicoVence?.slice(0, 10) ?? ""}
                  disabled={!autorizaSalud}
                  className={input}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted" htmlFor="alergias">
                  Alergias
                </label>
                <textarea
                  id="alergias"
                  name="alergias"
                  defaultValue={ficha.alergias ?? ""}
                  disabled={!autorizaSalud}
                  maxLength={300}
                  rows={2}
                  className={input}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  className="mb-1 block text-xs text-muted"
                  htmlFor="condicionesMedicas"
                >
                  Condiciones médicas
                </label>
                <textarea
                  id="condicionesMedicas"
                  name="condicionesMedicas"
                  defaultValue={ficha.condicionesMedicas ?? ""}
                  disabled={!autorizaSalud}
                  maxLength={300}
                  rows={2}
                  className={input}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 border-t border-subtle pt-3">
            <legend className="text-sm font-bold">Contacto de emergencia</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block text-xs text-muted"
                  htmlFor="contactoEmergenciaNombre"
                >
                  Nombre
                </label>
                <input
                  id="contactoEmergenciaNombre"
                  name="contactoEmergenciaNombre"
                  defaultValue={ficha.contactoEmergenciaNombre ?? ""}
                  maxLength={60}
                  className={input}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs text-muted"
                  htmlFor="contactoEmergenciaTelefono"
                >
                  Teléfono
                </label>
                <input
                  id="contactoEmergenciaTelefono"
                  name="contactoEmergenciaTelefono"
                  defaultValue={ficha.contactoEmergenciaTelefono ?? ""}
                  maxLength={30}
                  className={input}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs text-muted"
                  htmlFor="contactoEmergenciaParentesco"
                >
                  Parentesco
                </label>
                <select
                  id="contactoEmergenciaParentesco"
                  name="contactoEmergenciaParentesco"
                  defaultValue={ficha.contactoEmergenciaParentesco ?? ""}
                  className={input}
                >
                  <option value="">— Sin especificar —</option>
                  {PARENTESCOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="autorizaTraslado"
                defaultChecked={ficha.autorizaTraslado}
              />
              Autoriza a la escuela a trasladar al jugador en caso de lesión.
            </label>
          </fieldset>

          {state && !state.ok && (
            <p className="text-sm text-alerta" role="alert">{state.error}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Guardando…" : "Guardar ficha"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => onClose(false)}>
              Cerrar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
