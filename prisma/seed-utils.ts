import { diaEscuelaDe, offsetEscuelaMs } from "@/lib/fecha-calendario";

/**
 * Instante correspondiente a `hh:mm` del día de almanaque de la ESCUELA en que
 * cae `referencia`.
 *
 * `d.setHours(18, 0)` leería la zona del PROCESO: sembrando desde un runner en
 * UTC, "el entrenamiento de las 18:00" quedaba a las 13:00 hora de Colombia, y
 * cerca de medianoche podía caer directamente en otro día. Se arma el instante
 * a partir del día de almanaque de la escuela, igual que en
 * `src/lib/fecha-calendario.ts`.
 *
 * Compartida por los seeds curados (`seed-academia-elite.ts`,
 * `seed-demo-evolucion.ts`) — vivía duplicada en los dos; acá hay una sola
 * definición para que no puedan divergir.
 */
export function aHoraEscuela(referencia: Date, hora: number, minuto = 0): Date {
  const dia = diaEscuelaDe(referencia);
  const hh = String(hora).padStart(2, "0");
  const mm = String(minuto).padStart(2, "0");
  const comoSiFueraUtc = new Date(`${dia}T${hh}:${mm}:00.000Z`).getTime();
  return new Date(comoSiFueraUtc - offsetEscuelaMs(referencia));
}
