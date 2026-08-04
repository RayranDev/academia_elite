"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Sparkles } from "lucide-react";

// Una vez por sesión: si lo saltan, no vuelve a molestar hasta la próxima visita.
const CLAVE_SESION = "onboarding-jugador-sesion";

/**
 * Bienvenida de primer ingreso (guía prominente pero SALTABLE): invita a la
 * familia a configurar la carta —subir la foto con su consentimiento o elegir un
 * avatar— antes de empezar. Se muestra solo cuando el jugador todavía no tiene
 * foto ni dio el consentimiento (lo decide la página que lo renderiza), y una
 * sola vez por sesión. No bloquea: hay "Lo hago después".
 */
export function OnboardingBienvenida({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLAVE_SESION)) return;
      sessionStorage.setItem(CLAVE_SESION, "1");
    } catch {
      // sessionStorage no disponible: mostramos igual esta vez.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-65 flex items-center justify-center bg-overlay/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida"
    >
      <div className="w-full max-w-sm rounded-2xl border border-subtle bg-surface p-6 text-center shadow-2xl">
        <Sparkles className="mx-auto h-8 w-8 text-brand" aria-hidden />
        <h2 className="mt-2 text-2xl font-black italic uppercase">
          ¡Bienvenido/a, {nombre}!
        </h2>
        <p className="mt-2 text-sm text-muted">
          Arma tu carta: sube una foto (con el permiso de tu familia) o elige tu
          avatar. Lo puedes hacer ahora o más tarde, cuando quieras.
        </p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              router.push("/jugador/perfil");
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base"
          >
            <Camera className="h-4 w-4" aria-hidden /> Configurar mi carta
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="min-h-11 w-full rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-muted hover:text-foreground"
          >
            Lo hago después
          </button>
        </div>
      </div>
    </div>
  );
}
