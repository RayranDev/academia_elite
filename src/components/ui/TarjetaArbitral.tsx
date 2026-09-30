import { cn } from "@/lib/cn";

const FONDO = {
  amarilla: "bg-oro",
  roja: "bg-alerta",
  azul: "bg-info",
} as const;

/**
 * Tarjeta de árbitro dibujada con los colores del tema, en lugar del emoji del
 * sistema: el emoji se ve distinto en Windows, Mac y Android y no sigue la
 * paleta de la escuela. Es decorativa (`aria-hidden`): el significado lo lleva
 * el texto que la acompaña.
 */
export function TarjetaArbitral({
  color,
  className,
}: {
  color: keyof typeof FONDO;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] align-[-2px]",
        FONDO[color],
        className,
      )}
    />
  );
}
