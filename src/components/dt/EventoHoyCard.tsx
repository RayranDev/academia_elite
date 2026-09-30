import Link from "next/link";
import { ListChecks, Play, RotateCw, FileText, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { cn } from "@/lib/cn";
import { ETIQUETA_TIPO, ICONO_TIPO, TEXTO_TIPO } from "@/components/calendar/tipos";
import {
  accionPrincipalHoy,
  hrefPasarLista,
  type FaseSesionHoy,
} from "@/lib/eventos/hoy";
import type { EventoHoyDTO } from "@/services/evento.service";

const ETIQUETA_FASE: Record<FaseSesionHoy, string> = {
  POR_INICIAR: "Por iniciar",
  EN_CURSO: "En curso",
  CERRADA: "Sesión cerrada",
  CANCELADA: "Cancelado",
};

const TONO_FASE: Record<FaseSesionHoy, "info" | "pitch" | "neutral" | "alerta"> = {
  POR_INICIAR: "info",
  EN_CURSO: "pitch",
  CERRADA: "neutral",
  CANCELADA: "alerta",
};

const ICONO_ACCION: Record<FaseSesionHoy, typeof Play> = {
  POR_INICIAR: Play,
  EN_CURSO: RotateCw,
  CERRADA: FileText,
  CANCELADA: FileText,
};

/**
 * Tarjeta de un evento del día en el home del DT. La acción principal depende
 * de la fase de la sesión (iniciar / continuar / ver resumen) y sale de
 * `accionPrincipalHoy`, que reusa las rutas del Modo Sesión: la tarjeta no
 * decide reglas, solo las pinta. `destacado` marca el evento al que el DT
 * probablemente va ahora (en curso, o el próximo por iniciar) cuando el día
 * tiene varios.
 */
export function EventoHoyCard({
  ev,
  destacado,
}: {
  ev: EventoHoyDTO;
  destacado: boolean;
}) {
  const Icono = ICONO_TIPO[ev.tipo];
  const etiqueta = ETIQUETA_TIPO[ev.tipo] ?? ev.tipo;
  const accion = accionPrincipalHoy(ev.id, ev.fase);
  const IconoAccion = ICONO_ACCION[ev.fase];
  const puedePasarLista =
    ev.convocados > 0 && (ev.fase === "POR_INICIAR" || ev.fase === "EN_CURSO");
  const opaca = ev.fase === "CERRADA" || ev.fase === "CANCELADA";

  return (
    <Card
      className={cn(
        "space-y-4 p-4 sm:p-5",
        destacado && "border-brand/60 ring-1 ring-brand/30",
        ev.fase === "CANCELADA" && "border-alerta/50",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2",
            TEXTO_TIPO[ev.tipo],
            opaca && "opacity-60",
          )}
          aria-hidden
        >
          <Icono className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">
              <FechaLocal iso={ev.inicio} formato="HH:mm" /> · {etiqueta} ·{" "}
              {ev.categoriaNombre}
            </p>
            <Badge tono={TONO_FASE[ev.fase]}>
              {ev.fase === "EN_CURSO" && (
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pitch motion-safe:animate-pulse"
                  aria-hidden
                />
              )}
              {ETIQUETA_FASE[ev.fase]}
            </Badge>
          </div>
          <h3
            className={cn(
              "mt-1 text-xl font-display italic uppercase leading-tight",
              opaca && "text-muted",
            )}
          >
            {ev.titulo}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {ev.rival && (
              <>
                {ev.esLocal === false ? "Visitante" : "Local"} ante {ev.rival} ·{" "}
              </>
            )}
            {ev.convocados === 0
              ? "Sin convocatoria: se pasa lista a toda la categoría"
              : `${ev.convocados} ${ev.convocados === 1 ? "convocado" : "convocados"}`}
            {ev.sesionCerradaAt && (
              <>
                {" "}
                · cerrada a las <FechaLocal iso={ev.sesionCerradaAt} formato="HH:mm" />
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {accion && (
          <Link
            href={accion.href}
            className={buttonVariants({
              variant: ev.fase === "CERRADA" ? "secondary" : "primary",
              size: "lg",
              className: "w-full gap-2 sm:w-auto",
            })}
          >
            <IconoAccion className="h-4 w-4" aria-hidden />
            {accion.etiqueta}
          </Link>
        )}
        {puedePasarLista && (
          <Link
            href={hrefPasarLista(ev.id)}
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "w-full gap-2 sm:w-auto",
            })}
          >
            <ListChecks className="h-4 w-4" aria-hidden />
            Pasar lista
          </Link>
        )}
        <Link
          href={`/dt/eventos/${ev.id}`}
          className="inline-flex min-h-11 items-center gap-1 self-start px-1 text-sm font-semibold text-muted hover:text-foreground sm:ml-auto sm:self-auto"
        >
          Ver detalle
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
