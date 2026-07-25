"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Muestra una fecha/hora ISO en la zona horaria del NAVEGADOR (la del que mira),
 * no la del servidor.
 *
 * Por qué existe: en un Server Component, `new Date(iso).toLocaleString()` corre
 * en el servidor (Vercel = UTC), así que un lead creado a la tarde en Colombia
 * (UTC-5) se mostraba con la fecha del día siguiente. Al formatear en el cliente,
 * `date-fns` usa la zona local y la fecha queda correcta.
 *
 * `suppressHydrationWarning`: el HTML del servidor trae la fecha en UTC y el
 * cliente la reescribe en local; el warning de hidratación se silencia a
 * propósito (el cliente es el que manda y su valor es el correcto).
 */
export function FechaLocal({
  iso,
  formato = "d 'de' MMM, yyyy",
}: {
  iso: string;
  formato?: string;
}) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {format(new Date(iso), formato, { locale: es })}
    </time>
  );
}
