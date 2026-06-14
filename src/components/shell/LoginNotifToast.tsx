"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import type { NotificacionDTO } from "@/services/notificacion.service";

// Una sola vez por sesión del navegador (se reinicia al cerrar la pestaña).
const CLAVE_SESION = "notif-aviso-sesion";

/**
 * Aviso al entrar: resume las notificaciones sin leer del usuario (de qué son),
 * para cualquier rol. Aparece una vez por sesión; luego se accede por la campana.
 */
export function LoginNotifToast({
  notificaciones,
}: {
  notificaciones: NotificacionDTO[];
}) {
  const [visible, setVisible] = useState(false);
  const noLeidas = notificaciones.filter((n) => !n.leida);

  useEffect(() => {
    if (notificaciones.filter((n) => !n.leida).length === 0) return;
    try {
      if (sessionStorage.getItem(CLAVE_SESION)) return;
      sessionStorage.setItem(CLAVE_SESION, "1");
    } catch {
      // sessionStorage no disponible: mostramos igual el aviso esta vez.
    }
    // Mostrar solo en cliente: depende de sessionStorage (no existe en SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 9000);
    return () => clearTimeout(t);
  }, [notificaciones]);

  if (!visible || noLeidas.length === 0) return null;

  const muestras = noLeidas.slice(0, 3);
  const plural = noLeidas.length > 1;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 w-80 max-w-[90vw] rounded-xl border border-subtle bg-surface p-4 shadow-xl"
    >
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        className="absolute right-2 top-2 text-muted hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <p className="flex items-center gap-2 text-sm font-bold">
        <Bell className="h-4 w-4 text-brand" aria-hidden />
        Tenés {noLeidas.length} notificación{plural ? "es" : ""} sin leer
      </p>
      <ul className="mt-2 space-y-1">
        {muestras.map((n) => (
          <li key={n.id} className="truncate text-xs text-muted">
            • {n.titulo}
          </li>
        ))}
        {noLeidas.length > muestras.length && (
          <li className="text-xs text-muted">
            y {noLeidas.length - muestras.length} más…
          </li>
        )}
      </ul>
      <p className="mt-2 text-[11px] text-muted">
        Abrí la campana para verlas todas.
      </p>
    </div>
  );
}
