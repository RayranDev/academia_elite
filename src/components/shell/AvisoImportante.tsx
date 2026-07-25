"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { marcarLeidaAction } from "@/actions/notificacion.actions";
import type { NotificacionDTO } from "@/services/notificacion.service";

// Una sola vez por sesión del navegador (se reinicia al cerrar la pestaña): no
// interrumpe en cada navegación.
const CLAVE_SESION = "aviso-importante-sesion";

// "Importante" = prioridad alta o crítica (p. ej. convocatoria, bloqueo). Las
// notificaciones comunes NO abren el modal: quedan en la campana.
const IMPORTANTES = new Set(["alta", "critica"]);

/**
 * Modal centrado (con el fondo borroso) que aparece SOLO cuando hay avisos
 * importantes sin leer, al entrar. Interrumpe a propósito. Se cierra con
 * "Aceptar", tocando fuera, o tocando un aviso (que además navega y lo marca
 * leído). Las notificaciones comunes se siguen viendo por la campana.
 */
export function AvisoImportante({
  notificaciones,
}: {
  notificaciones: NotificacionDTO[];
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const avisos = notificaciones.filter(
    (n) => !n.leida && IMPORTANTES.has(n.prioridad),
  );

  useEffect(() => {
    const hay = notificaciones.some(
      (n) => !n.leida && IMPORTANTES.has(n.prioridad),
    );
    if (!hay) return;
    try {
      if (sessionStorage.getItem(CLAVE_SESION)) return;
      sessionStorage.setItem(CLAVE_SESION, "1");
    } catch {
      // sessionStorage no disponible: mostramos igual esta vez.
    }
    // Solo en cliente (depende de sessionStorage, no existe en SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, [notificaciones]);

  if (!visible || avisos.length === 0) return null;

  function abrir(n: NotificacionDTO) {
    setVisible(false);
    void marcarLeidaAction(n.id);
    if (n.url) {
      router.push(n.url);
      router.refresh();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/40 p-4 backdrop-blur-sm"
      onClick={() => setVisible(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Avisos importantes"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-subtle bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="flex items-center gap-2 text-lg font-black italic uppercase">
          <Bell className="h-5 w-5 text-brand" aria-hidden />
          {avisos.length > 1 ? "Tenés avisos" : "Tenés un aviso"}
        </p>
        <ul className="mt-3 space-y-2">
          {avisos.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => abrir(n)}
                className="w-full rounded-lg border border-subtle bg-surface-2 p-3 text-left transition hover:border-brand"
              >
                <span className="block text-sm font-semibold text-foreground">
                  {n.titulo}
                </span>
                {n.cuerpo && (
                  <span className="mt-0.5 block text-xs text-muted">
                    {n.cuerpo}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="mt-4 min-h-11 w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
