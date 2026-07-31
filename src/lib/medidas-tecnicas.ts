import type { Posicion } from "@/types";

/**
 * Qué mide realmente cada nota técnica, según la posición del jugador.
 *
 * El modelo `Evaluacion` guarda cuatro notas de 1 a 10 en columnas fijas
 * (`controlBalon`, `pase`, `tiro`, `regate`). Para un jugador de campo esos
 * nombres describen lo que el DT puntúa; para un **portero** no: nadie evalúa el
 * regate de un arquero, evalúa su blocaje, su distribución, su juego aéreo y su
 * achique.
 *
 * Este mapa reetiqueta esas mismas cuatro notas cuando el jugador es POR. No
 * cambia el schema: cambia **qué le estamos pidiendo al DT que puntúe**, y
 * `derivaStatsPortero` usa esas notas con la fórmula que corresponde.
 *
 * Si algún día el arquero necesita medidas propias de verdad (columnas nuevas),
 * este archivo es el punto de partida: ya deja escrito qué significa cada una.
 */

/** Las cuatro columnas técnicas del modelo `Evaluacion`, en orden. */
export const CLAVES_TECNICAS = [
  "controlBalon",
  "pase",
  "tiro",
  "regate",
] as const;

export type ClaveTecnica = (typeof CLAVES_TECNICAS)[number];

export interface MedidaTecnica {
  etiqueta: string;
  ayuda: string;
}

const CAMPO: Record<ClaveTecnica, MedidaTecnica> = {
  controlBalon: {
    etiqueta: "Control",
    ayuda: "Primer toque y dominio del balón bajo presión.",
  },
  pase: {
    etiqueta: "Pase",
    ayuda: "Precisión y peso del pase, corto y largo.",
  },
  tiro: {
    etiqueta: "Tiro",
    ayuda: "Potencia, colocación y definición frente al arco.",
  },
  regate: {
    etiqueta: "Regate",
    ayuda: "Conducción y capacidad de superar al rival.",
  },
};

const PORTERO: Record<ClaveTecnica, MedidaTecnica> = {
  controlBalon: {
    etiqueta: "Blocaje / atajada",
    ayuda: "Reflejos, seguridad de manos y capacidad de retener o rechazar bien.",
  },
  pase: {
    etiqueta: "Distribución / saque",
    ayuda: "Saque de mano y de pie: precisión y criterio para iniciar el juego.",
  },
  tiro: {
    etiqueta: "Juego aéreo",
    ayuda: "Salida por centros y córners: despeje de puños, corte y dominio del área.",
  },
  regate: {
    etiqueta: "Achique y 1v1",
    ayuda: "Lectura para salir a tiempo y resolver el mano a mano.",
  },
};

/** Etiquetas de las cuatro notas técnicas para una posición. */
export function medidasTecnicas(posicion: Posicion): Record<ClaveTecnica, MedidaTecnica> {
  return posicion === "POR" ? PORTERO : CAMPO;
}

/**
 * Título del bloque técnico en el formulario de evaluación. Para el arquero no
 * es "Técnica" a secas: lo que se mide es otro oficio.
 */
export function tituloBloqueTecnico(posicion: Posicion): string {
  return posicion === "POR" ? "Técnica de portero" : "Técnica";
}
