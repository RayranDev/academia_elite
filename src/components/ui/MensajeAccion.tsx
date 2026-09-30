import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Respuesta visible de una acción del usuario (AGENTS.md §6 bis): éxito o error,
 * en una región viva para que los lectores de pantalla lo anuncien. El
 * contenedor está SIEMPRE en el DOM —una región viva que aparece junto con su
 * contenido a veces no se anuncia— y reserva su altura para que el mensaje no
 * empuje el layout al aparecer.
 *
 * El proyecto no tiene una primitiva de toast; un mensaje en línea pegado al
 * botón que lo originó además queda a la vista en el celular, sin depender de
 * que el usuario mire una esquina de la pantalla.
 */
export function MensajeAccion({
  exito,
  error,
  className,
}: {
  exito?: string | null;
  error?: string | null;
  className?: string;
}) {
  return (
    <div aria-live="polite" className={cn("min-h-6 text-sm", className)}>
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 font-semibold text-alerta">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : exito ? (
        <p role="status" className="flex items-start gap-1.5 font-semibold text-pitch">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{exito}</span>
        </p>
      ) : null}
    </div>
  );
}
