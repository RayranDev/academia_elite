"use client";

import { useId, useState } from "react";
import { aceptarPoliticaAction } from "@/actions/politica.actions";
import { logout } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";
import { TERMINOS_VERSION } from "@/lib/legal";

/**
 * Aceptación de la Política en el primer ingreso de la familia (cuenta creada por
 * el alta asistida). La casilla manda: el botón queda deshabilitado hasta
 * marcarla y el servidor la exige igual. Tras aceptar, la acción redirige al
 * panel; mientras tanto el botón muestra el estado de carga.
 *
 * Envía con `onSubmit` + transición (`useEnvioAccion`) y no con
 * `<form action>`: React 19 reiniciaría la casilla al terminar la acción y, ante
 * un error, la familia la vería desmarcada sin haberla tocado.
 *
 * "No acepto, salir" es un `<form>` aparte (no se anidan formularios) que cierra
 * la sesión con la misma acción que el resto de la app.
 */
export function AceptarPoliticaForm() {
  const idCasilla = useId();
  const [acepta, setAcepta] = useState(false);
  const { enviar, pendiente, error, limpiar } = useEnvioAccion(aceptarPoliticaAction);

  return (
    <div className="space-y-4">
      <form onSubmit={enviar} className="space-y-4" aria-busy={pendiente}>
        <div className="flex items-start gap-3">
          <input
            id={idCasilla}
            type="checkbox"
            name="aceptaTerminos"
            checked={acepta}
            onChange={(e) => {
              setAcepta(e.target.checked);
              limpiar();
            }}
            disabled={pendiente}
            className="mt-1 h-4 w-4 shrink-0 accent-pitch"
          />
          <label htmlFor={idCasilla} className="text-sm leading-relaxed text-foreground">
            He leído y acepto la Política de Tratamiento de Datos Personales (versión{" "}
            {TERMINOS_VERSION}) y autorizo el tratamiento de los datos de los niños,
            niñas y adolescentes a mi cargo conforme a ella.
          </label>
        </div>

        <MensajeAccion error={error} />

        <Button type="submit" size="lg" className="w-full" disabled={!acepta || pendiente}>
          {pendiente ? "Guardando…" : "Aceptar y continuar"}
        </Button>
      </form>

      {/* suppressHydrationWarning: extensiones del navegador pueden inyectar
          atributos en el <form> antes de hidratar (mismo caso que /bloqueado). */}
      <form action={logout} suppressHydrationWarning className="text-center">
        <Button type="submit" variant="ghost" size="sm" disabled={pendiente}>
          No acepto, salir
        </Button>
      </form>
    </div>
  );
}
