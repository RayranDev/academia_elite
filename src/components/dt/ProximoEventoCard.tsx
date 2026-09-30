import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { FechaLocal } from "@/components/ui/FechaLocal";
import { cn } from "@/lib/cn";
import { ETIQUETA_TIPO, ICONO_TIPO, TEXTO_TIPO } from "@/components/calendar/tipos";
import type { ProximoEventoDtDTO } from "@/services/evento.service";

/**
 * Lo que viene después de hoy. Aparece cuando hoy no hay nada por hacer (sin
 * eventos, o todos cerrados o cancelados) para que el home nunca sea una
 * pantalla muerta: un toque lleva al evento o al calendario.
 */
export function ProximoEventoCard({ ev }: { ev: ProximoEventoDtDTO }) {
  const Icono = ICONO_TIPO[ev.tipo];
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2",
            TEXTO_TIPO[ev.tipo],
          )}
          aria-hidden
        >
          <Icono className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            <FechaLocal iso={ev.inicio} formato="EEEE d 'de' MMMM · HH:mm" />
          </p>
          <h3 className="mt-1 text-xl font-display italic uppercase leading-tight">
            {ev.titulo}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {ETIQUETA_TIPO[ev.tipo]} · {ev.categoriaNombre}
            {ev.rival && (
              <>
                {" "}
                · {ev.esLocal === false ? "Visitante" : "Local"} ante {ev.rival}
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          href={`/dt/eventos/${ev.id}`}
          className={buttonVariants({
            variant: "secondary",
            size: "lg",
            className: "w-full gap-2 sm:w-auto",
          })}
        >
          Ver evento
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/dt/calendario"
          className={buttonVariants({
            variant: "ghost",
            size: "lg",
            className: "w-full gap-2 sm:w-auto",
          })}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
          Abrir calendario
        </Link>
      </div>
    </Card>
  );
}
