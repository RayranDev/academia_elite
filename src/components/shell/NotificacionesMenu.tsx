"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  marcarLeidaAction,
  marcarTodasLeidasAction,
} from "@/actions/notificacion.actions";
import type { NotificacionDTO } from "@/services/notificacion.service";

/** Color del indicador según la prioridad de la notificación (no leída). */
function colorPrioridad(prioridad: string): string {
  if (prioridad === "critica") return "bg-alerta";
  if (prioridad === "alta") return "bg-oro";
  return "bg-brand";
}

/**
 * Campana de notificaciones: muestra el contador de no leídas y, al desplegarse,
 * la lista. Cada ítem con `url` navega a la sección donde se evidencia la
 * notificación y se marca como leída.
 *
 * La fuente de verdad es `inicial` (server): antes se copiaba a `useState`, que
 * SOLO se siembra al montar, así que ni las nuevas notificaciones llegaban ni el
 * marcado se reflejaba al revalidar. Ahora se renderiza directo del prop y solo
 * se mantiene un overlay LOCAL de "recién marcadas como leídas" para que el tilde
 * sea instantáneo; cuando el server revalida, ya trae `leida: true` y el overlay
 * queda inocuo (idempotente).
 *
 * `inicial` viene de `PanelShell`, que vive en el `layout.tsx` de cada rol. Un
 * layout NO se vuelve a ejecutar al navegar entre páginas hijas (solo la propia
 * `page.tsx` cambia), así que sin ayuda esta campana quedaría congelada en lo
 * que había al entrar a la sección. Por eso pedimos `router.refresh()` solos:
 * cada 60s y cada vez que la pestaña vuelve a estar visible (volviste de otra
 * app/pestaña) — eso SÍ vuelve a ejecutar el layout con datos frescos.
 */
export function NotificacionesMenu({
  inicial,
}: {
  inicial: NotificacionDTO[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [leidasOpt, setLeidasOpt] = useState<Set<string>>(() => new Set());

  const items = inicial.map((n) =>
    leidasOpt.has(n.id) ? { ...n, leida: true } : n,
  );
  const noLeidas = items.filter((n) => !n.leida).length;

  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), 60_000);
    function alVolverVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", alVolverVisible);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolverVisible);
    };
  }, [router]);

  function cerrar() {
    setAbierto(false);
  }

  async function abrirNotificacion(n: NotificacionDTO) {
    cerrar();
    if (!n.leida) {
      setLeidasOpt((prev) => new Set(prev).add(n.id));
      const res = await marcarLeidaAction(n.id);
      // Si falló, revertimos el tilde optimista para no mentir el estado.
      if (!res.ok) {
        setLeidasOpt((prev) => {
          const s = new Set(prev);
          s.delete(n.id);
          return s;
        });
      }
    }
    if (n.url) router.push(n.url);
    else router.refresh();
  }

  async function marcarTodas() {
    const previas = leidasOpt;
    setLeidasOpt(new Set(inicial.map((n) => n.id)));
    const res = await marcarTodasLeidasAction();
    if (!res.ok) setLeidasOpt(previas);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative flex items-center gap-1 rounded-full bg-brand/15 px-2 py-1 text-xs font-bold text-brand transition hover:bg-brand/25"
        aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ""}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <Bell className="h-3.5 w-3.5" aria-hidden />
        {noLeidas > 0 && <span>{noLeidas}</span>}
      </button>

      {abierto && (
        <>
          {/* Backdrop para cerrar al hacer clic fuera */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={cerrar}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-subtle bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-subtle px-4 py-2">
              <p className="text-sm font-bold">Notificaciones</p>
              {noLeidas > 0 && (
                <button
                  type="button"
                  onClick={marcarTodas}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Marcar todas
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No tienes notificaciones.
              </p>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id} className="border-b border-subtle/50 last:border-0">
                    <button
                      type="button"
                      onClick={() => abrirNotificacion(n)}
                      className={`flex w-full items-start gap-2 px-4 py-3 text-left transition hover:bg-surface-2 ${
                        n.leida ? "opacity-60" : ""
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.leida ? "bg-transparent" : colorPrioridad(n.prioridad)
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {n.titulo}
                        </span>
                        {n.cuerpo && (
                          <span className="mt-0.5 block text-xs text-muted">
                            {n.cuerpo}
                          </span>
                        )}
                        <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted">
                          {new Date(n.createdAt).toLocaleString("es")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
