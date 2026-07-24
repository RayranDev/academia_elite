/**
 * Máquina de períodos de un partido (PURA: mismas entradas → mismas salidas, sin
 * Prisma ni React). Modela cómo transcurre un partido de verdad — dos tiempos,
 * con alargue y/o penales SOLO si el torneo lo pide — en vez de un cronómetro
 * corrido de punta a punta.
 *
 * El avance NO es lineal: al terminar el segundo tiempo el DT elige si el partido
 * se acabó, si va a alargue o si va directo a penales. Por eso las transiciones
 * se declaran explícitamente y el servicio valida el destino contra ellas: así un
 * toque mal dado no puede saltar de "primer tiempo" a "penales".
 */

export const PERIODOS = [
  "NO_INICIADO",
  "PRIMER_TIEMPO",
  "ENTRETIEMPO",
  "SEGUNDO_TIEMPO",
  "ALARGUE_1",
  "DESCANSO_ALARGUE",
  "ALARGUE_2",
  "PENALES",
  "FINALIZADO",
] as const;

export type Periodo = (typeof PERIODOS)[number];

/** Destinos válidos desde cada período. Un destino fuera de acá se rechaza. */
const TRANSICIONES: Record<Periodo, readonly Periodo[]> = {
  NO_INICIADO: ["PRIMER_TIEMPO"],
  PRIMER_TIEMPO: ["ENTRETIEMPO"],
  ENTRETIEMPO: ["SEGUNDO_TIEMPO"],
  // Fin del tiempo reglamentario: acá se decide el desenlace.
  SEGUNDO_TIEMPO: ["FINALIZADO", "ALARGUE_1", "PENALES"],
  ALARGUE_1: ["DESCANSO_ALARGUE"],
  DESCANSO_ALARGUE: ["ALARGUE_2"],
  // Tras el alargue todavía puede haber empate → penales.
  ALARGUE_2: ["FINALIZADO", "PENALES"],
  PENALES: ["FINALIZADO"],
  FINALIZADO: [],
};

const ETIQUETAS: Record<Periodo, string> = {
  NO_INICIADO: "Sin comenzar",
  PRIMER_TIEMPO: "1er tiempo",
  ENTRETIEMPO: "Entretiempo",
  SEGUNDO_TIEMPO: "2do tiempo",
  ALARGUE_1: "Alargue · 1er tiempo",
  DESCANSO_ALARGUE: "Descanso del alargue",
  ALARGUE_2: "Alargue · 2do tiempo",
  PENALES: "Definición por penales",
  FINALIZADO: "Finalizado",
};

/** Texto del botón que lleva a cada destino (lo lee el DT en cancha). */
const ACCIONES: Record<Periodo, string> = {
  NO_INICIADO: "Comenzar",
  PRIMER_TIEMPO: "Arrancar 1er tiempo",
  ENTRETIEMPO: "Fin del 1er tiempo",
  SEGUNDO_TIEMPO: "Arrancar 2do tiempo",
  ALARGUE_1: "Ir a alargue",
  DESCANSO_ALARGUE: "Fin del 1er tiempo del alargue",
  ALARGUE_2: "Arrancar 2do tiempo del alargue",
  PENALES: "Ir a penales",
  FINALIZADO: "Finalizar partido",
};

export function esPeriodo(valor: string): valor is Periodo {
  return (PERIODOS as readonly string[]).includes(valor);
}

export function etiquetaPeriodo(p: Periodo): string {
  return ETIQUETAS[p];
}

/** Texto del botón para avanzar HACIA `destino`. */
export function accionHacia(destino: Periodo): string {
  return ACCIONES[destino];
}

export function siguientesPeriodos(actual: Periodo): readonly Periodo[] {
  return TRANSICIONES[actual];
}

export function puedeAvanzar(actual: Periodo, destino: Periodo): boolean {
  return TRANSICIONES[actual].includes(destino);
}

/** ¿Corre el reloj? Solo en los tiempos jugados; no en descansos ni penales. */
export function enJuego(p: Periodo): boolean {
  return (
    p === "PRIMER_TIEMPO" ||
    p === "SEGUNDO_TIEMPO" ||
    p === "ALARGUE_1" ||
    p === "ALARGUE_2"
  );
}

/** ¿Se pueden registrar goles de juego? (En penales se usa el marcador aparte.) */
export function aceptaGoles(p: Periodo): boolean {
  return enJuego(p);
}

/** ¿El partido ya terminó? */
export function estaFinalizado(p: Periodo): boolean {
  return p === "FINALIZADO";
}
