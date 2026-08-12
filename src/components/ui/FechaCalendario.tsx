import { format } from "date-fns";
import { es } from "date-fns/locale";
import { diaDeISO } from "@/lib/fecha-calendario";

/**
 * Muestra una fecha de CALENDARIO (cumpleaños, vencimiento del apto médico)
 * exactamente como se cargó, sin convertir zonas.
 *
 * Es la contracara de `FechaLocal`, y la diferencia importa: `FechaLocal` está
 * para INSTANTES (cuándo se creó un lead, cuándo empieza un evento), donde
 * mostrar la hora del que mira es lo correcto. Un día del almanaque no tiene
 * hora, y pasarlo por una zona lo corre: una fecha guardada como
 * `2026-08-12T00:00:00Z` se leía "11 ago" en Colombia (UTC-5) — un día menos
 * del que la escuela había cargado.
 *
 * A diferencia de `FechaLocal` NO necesita `"use client"` ni
 * `suppressHydrationWarning`: al formatear a partir de los componentes
 * año/mes/día, el resultado es el mismo en el servidor y en el navegador.
 */
export function FechaCalendario({
  iso,
  formato = "d 'de' MMM, yyyy",
}: {
  iso: string;
  formato?: string;
}) {
  const dia = diaDeISO(iso);
  const [anio, mes, numero] = dia.split("-").map(Number);
  return (
    <time dateTime={dia}>
      {format(new Date(anio, mes - 1, numero), formato, { locale: es })}
    </time>
  );
}
