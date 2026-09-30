"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  aprobarSolicitudAction,
  rechazarSolicitudAction,
} from "@/actions/dt.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FechaCalendario } from "@/components/ui/FechaCalendario";
import type { SolicitudDTO } from "@/services/jugador.service";

interface Aviso {
  id: string;
  tono: "ok" | "error";
  texto: string;
  /** Solo al aprobar: lleva directo a evaluar al jugador recién activado. */
  evaluarJugadorId?: string;
}

/**
 * Solicitudes de familias pendientes de aprobación. Antes, aprobar o rechazar
 * recargaba la página y la tarjeta simplemente desaparecía, sin decir qué había
 * pasado ni permitir deshacer un rechazo por un toque de más. Ahora:
 *  - el botón muestra "Aprobando…" / "Rechazando…" y bloquea la fila;
 *  - rechazar pide una confirmación en la misma fila (deja al jugador INACTIVO);
 *  - el resultado queda confirmado arriba, aunque la tarjeta ya no esté;
 *  - si algo falla, el error aparece en la fila y la solicitud sigue ahí.
 */
export function SolicitudesLista({ solicitudes }: { solicitudes: SolicitudDTO[] }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [erroresFila, setErroresFila] = useState<Record<string, string>>({});
  const [enProceso, setEnProceso] = useState<string | null>(null);
  const [confirmandoRechazo, setConfirmandoRechazo] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  function resolver(s: SolicitudDTO, accion: "aprobar" | "rechazar") {
    const fd = new FormData();
    fd.set("jugadorId", s.id);
    setEnProceso(s.id);
    setConfirmandoRechazo(null);
    setErroresFila(({ [s.id]: _omitido, ...resto }) => resto);
    iniciar(async () => {
      const res =
        accion === "aprobar"
          ? await aprobarSolicitudAction(fd)
          : await rechazarSolicitudAction(fd);
      setEnProceso(null);
      const nombre = `${s.nombre} ${s.apellido}`;
      if (res.ok) {
        setAvisos((prev) => [
          {
            id: s.id,
            tono: "ok",
            texto:
              accion === "aprobar"
                ? `${nombre} fue aprobado y ya está activo.`
                : `Se rechazó la solicitud de ${nombre}.`,
            evaluarJugadorId: accion === "aprobar" ? s.id : undefined,
          },
          ...prev,
        ]);
      } else {
        setErroresFila((prev) => ({ ...prev, [s.id]: res.error }));
      }
    });
  }

  return (
    <div className="space-y-3">
      <div aria-live="polite" className="space-y-2">
        {avisos.map((a) => (
          <p
            key={a.id}
            role="status"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-pitch/30 bg-pitch/10 px-3 py-2 text-sm font-semibold text-pitch"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <span>{a.texto}</span>
            {a.evaluarJugadorId && (
              <Link
                href={`/dt/jugadores/${a.evaluarJugadorId}/evaluar`}
                className="underline underline-offset-2"
              >
                Evaluar ahora
              </Link>
            )}
          </p>
        ))}
      </div>

      {solicitudes.length === 0 ? (
        <Card>
          <p className="text-muted">No hay solicitudes pendientes.</p>
        </Card>
      ) : (
        solicitudes.map((s) => {
          const ocupada = enProceso === s.id;
          const error = erroresFila[s.id];
          return (
            <Card key={s.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">
                    {s.nombre} {s.apellido}
                  </p>
                  <p className="text-xs text-muted">
                    {s.categoriaNombre} · Nac.{" "}
                    <FechaCalendario iso={s.fechaNacimiento} formato="d MMM yyyy" />
                  </p>
                  {s.padreEmail && (
                    <p className="text-xs text-muted">
                      Tutor: {s.padreNombre} ({s.padreEmail})
                    </p>
                  )}
                </div>
                {confirmandoRechazo === s.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">
                      ¿Rechazar a {s.nombre}? Quedará inactivo.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => resolver(s, "rechazar")}
                    >
                      Sí, rechazar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmandoRechazo(null)}
                    >
                      Volver
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => resolver(s, "aprobar")}
                      disabled={ocupada}
                      aria-busy={ocupada}
                    >
                      {ocupada ? "Procesando…" : "Aprobar"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => setConfirmandoRechazo(s.id)}
                      disabled={ocupada}
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
              {error && (
                <p role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-alerta">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </p>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
