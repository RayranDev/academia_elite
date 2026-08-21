import { offsetEscuelaMs } from "@/lib/fecha-calendario";

/**
 * Helpers puros del perfil del DT (sin Prisma ni React): mismas entradas →
 * mismas salidas. Viven acá (y no en `dt-perfil.service.ts`) para poder
 * testearlos sin arrastrar el árbol de imports de Prisma (los servicios
 * importan repositorios, que importan `@/lib/db`, que exige `DATABASE_URL`).
 */

/**
 * Primer día del mes de `fecha`, a medianoche EN LA HORA DE LA ESCUELA, no la
 * del proceso. Mismo motivo que `periodoDe` en `src/lib/cobranza.ts`: en Vercel
 * el server corre en UTC, y `getFullYear()/getMonth()` a secas leerían el mes
 * adelantado hasta 5 horas antes de que cierre de verdad en Colombia — "Este
 * mes" del perfil del DT mostraría el mes que viene un rato antes de que
 * empiece localmente.
 *
 * Devuelve un INSTANTE (se compara contra `createdAt` en las queries), por eso
 * necesita el offset y no le alcanza con el día de almanaque.
 */
export function inicioDeMes(fecha: Date): Date {
  const offset = offsetEscuelaMs(fecha);
  const enZonaEscuela = new Date(fecha.getTime() + offset);
  const inicioEnZonaEscuela = Date.UTC(
    enZonaEscuela.getUTCFullYear(),
    enZonaEscuela.getUTCMonth(),
    1,
  );
  return new Date(inicioEnZonaEscuela - offset);
}
