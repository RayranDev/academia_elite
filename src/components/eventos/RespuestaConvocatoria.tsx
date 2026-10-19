"use client";

import { useState } from "react";
import { confirmarConvocatoriaAction } from "@/actions/evento.actions";
import { Badge } from "@/components/ui/Badge";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { useEnvioAccion } from "@/components/ui/useEnvioAccion";
import { cn } from "@/lib/cn";
import { mensajeRespuestaConvocatoria } from "@/lib/eventos/convocatoria";
import type { Confirmacion } from "@/types";

type Variante = "grande" | "compacta";

const BOTON_CONFIRMAR: Record<Variante, string> = {
  grande: "rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-base",
  compacta: "rounded bg-pitch px-2 py-1 text-xs font-semibold text-base",
};
const BOTON_RECHAZAR: Record<Variante, string> = {
  grande:
    "rounded-lg border border-subtle px-4 py-2 text-sm text-muted hover:text-foreground",
  compacta:
    "rounded border border-subtle px-2 py-1 text-xs text-muted hover:text-foreground",
};
const DESHABILITADO = "disabled:pointer-events-none disabled:opacity-50";

/**
 * Respuesta de la familia a una convocatoria: estado actual + botones para
 * responder o rectificar (la respuesta nunca queda fija). Compartido por
 * ProximoPartidoTile, UpcomingList y el detalle de evento del jugador.
 *
 * Es UN solo componente cliente para todos los estados (pendiente, confirmado,
 * rechazado): al revalidar la página el estado cambia pero el componente sigue
 * montado, así el mensaje de éxito no se pierde. Envía con `useEnvioAccion`
 * (onSubmit + transición): mientras el servidor responde los botones se
 * deshabilitan ("Guardando…") y un error aparece junto al botón en vez de caer
 * al error.tsx del segmento (AGENTS.md §5 y §6 bis).
 */
export function RespuestaConvocatoria({
  eventoId,
  jugadorId,
  confirmacion,
  variante = "grande",
}: {
  eventoId: string;
  jugadorId: string;
  confirmacion: Confirmacion | null;
  variante?: Variante;
}) {
  const { enviar, pendiente, resultado, error, limpiar } = useEnvioAccion(
    confirmarConvocatoriaAction,
  );
  // Qué botón se tocó, para rotular solo ese con "Guardando…".
  const [destino, setDestino] = useState<Confirmacion | null>(null);

  const exito =
    resultado?.ok && resultado.data
      ? mensajeRespuestaConvocatoria(resultado.data.confirmacion)
      : null;

  // Función que devuelve JSX (no un componente anidado): un componente definido
  // dentro del render cambia de identidad en cada render y React desmontaría el
  // botón, perdiendo el foco justo cuando se está enviando.
  function opcion(a: "CONFIRMADO" | "RECHAZADO", texto: string, clase: string) {
    return (
      <form
        onSubmit={(e) => {
          limpiar();
          setDestino(a);
          enviar(e);
        }}
      >
        <input type="hidden" name="eventoId" value={eventoId} />
        <input type="hidden" name="jugadorId" value={jugadorId} />
        <input type="hidden" name="confirmacion" value={a} />
        <button
          type="submit"
          disabled={pendiente}
          aria-busy={pendiente && destino === a}
          className={cn(clase, DESHABILITADO)}
        >
          {pendiente && destino === a ? "Guardando…" : texto}
        </button>
      </form>
    );
  }

  const textoCambiar = (confirmar: boolean) =>
    confirmar
      ? variante === "grande"
        ? "Cambiar: confirmar asistencia"
        : "Cambiar: confirmar"
      : "Cambiar: no asistiré";
  const claseCambiar =
    "text-xs font-medium text-muted underline hover:text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirmacion === "CONFIRMADO" ? (
        <>
          <Badge tono="pitch">Asistencia confirmada</Badge>
          {opcion("RECHAZADO", textoCambiar(false), claseCambiar)}
        </>
      ) : confirmacion === "RECHAZADO" ? (
        <>
          <Badge tono="alerta">No asistirá</Badge>
          {opcion("CONFIRMADO", textoCambiar(true), claseCambiar)}
        </>
      ) : (
        <>
          {variante === "compacta" && <Badge tono="oro">Confirmación pendiente</Badge>}
          {opcion(
            "CONFIRMADO",
            variante === "grande" ? "Confirmar asistencia" : "Confirmar",
            BOTON_CONFIRMAR[variante],
          )}
          {opcion("RECHAZADO", "No asistirá", BOTON_RECHAZAR[variante])}
        </>
      )}
      <MensajeAccion
        exito={exito}
        error={error}
        reservarAltura={false}
        className="basis-full"
      />
    </div>
  );
}
