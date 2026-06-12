"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "fcm-tema";

// El estado real vive en el DOM (clase `light` en <html>); el componente se
// suscribe a sus cambios para no duplicar estado en React.
function suscribir(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
}

function leerClaro() {
  return document.documentElement.classList.contains("light");
}

/**
 * Alterna el tema claro/oscuro aplicando la clase `light` en <html>.
 * La preferencia se guarda en localStorage y un script inline en el layout
 * raíz la aplica antes del primer pintado (anti-FOUC).
 */
export function ThemeToggle() {
  const claro = useSyncExternalStore(suscribir, leerClaro, () => false);

  function alternar() {
    const siguiente = !leerClaro();
    document.documentElement.classList.toggle("light", siguiente);
    try {
      localStorage.setItem(KEY, siguiente ? "light" : "dark");
    } catch {
      /* almacenamiento bloqueado: el tema aplica solo a esta vista */
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={claro ? "Modo oscuro" : "Modo claro"}
      className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {claro ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
    </button>
  );
}
