import { format, startOfWeek } from "date-fns";

/**
 * Motor del progreso personal (crecimiento fuera de la cancha).
 * TS puro y determinista: XP por hábitos validados cada semana por el
 * responsable, nivel personal y los atributos Mentalidad/Disciplina.
 * Independiente del motor deportivo: NUNCA toca OVR ni los stats de la carta.
 */

export const HABITOS = [
  "academico",
  "comportamiento",
  "puntualidad",
  "ayudaCasa",
  "valores",
] as const;
export type Habito = (typeof HABITOS)[number];

export const ETIQUETA_HABITO: Record<Habito, string> = {
  academico: "Logros académicos",
  comportamiento: "Buen comportamiento",
  puntualidad: "Puntualidad",
  ayudaCasa: "Ayuda en casa",
  valores: "Valores personales",
};

export type SemanaHabitos = Record<Habito, boolean>;

/** XP que otorga cada hábito cumplido en una semana validada. */
export const XP_POR_HABITO = 10;
/** XP necesaria para subir cada nivel personal. */
export const XP_POR_NIVEL = 100;

/** Hábitos que alimentan cada atributo. */
export const HABITOS_MENTALIDAD: Habito[] = ["academico", "valores"];
export const HABITOS_DISCIPLINA: Habito[] = [
  "puntualidad",
  "comportamiento",
  "ayudaCasa",
];

const ATRIBUTO_BASE = 50;
const ATRIBUTO_MAX = 99;
/** Semanas recientes que cuentan para los atributos (ventana móvil). */
export const VENTANA_SEMANAS = 12;

/** Lunes ISO de la semana de `fecha`, como "yyyy-MM-dd". */
export function inicioSemanaISO(fecha: Date): string {
  return format(startOfWeek(fecha, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function xpDeSemana(s: SemanaHabitos): number {
  return HABITOS.filter((h) => s[h]).length * XP_POR_HABITO;
}

export function xpTotal(semanas: SemanaHabitos[]): number {
  return semanas.reduce((acc, s) => acc + xpDeSemana(s), 0);
}

export interface NivelPersonal {
  nivel: number;
  xpEnNivel: number;
  xpParaSubir: number;
}

export function nivelPersonal(xp: number): NivelPersonal {
  const xpSeguro = Math.max(0, xp);
  return {
    nivel: 1 + Math.floor(xpSeguro / XP_POR_NIVEL),
    xpEnNivel: xpSeguro % XP_POR_NIVEL,
    xpParaSubir: XP_POR_NIVEL,
  };
}

function atributo(semanas: SemanaHabitos[], habitos: Habito[]): number {
  const recientes = semanas.slice(0, VENTANA_SEMANAS);
  if (recientes.length === 0) return ATRIBUTO_BASE;
  const posibles = recientes.length * habitos.length;
  const cumplidos = recientes.reduce(
    (acc, s) => acc + habitos.filter((h) => s[h]).length,
    0,
  );
  const ratio = cumplidos / posibles;
  return Math.min(
    ATRIBUTO_MAX,
    ATRIBUTO_BASE + Math.round(ratio * (ATRIBUTO_MAX - ATRIBUTO_BASE)),
  );
}

export interface AtributosPersonales {
  mentalidad: number;
  disciplina: number;
}

/**
 * Atributos 50–99 sobre la ventana de semanas más recientes (orden: la más
 * reciente primero). Sin semanas validadas, ambos parten en 50.
 */
export function calcularAtributos(
  semanas: SemanaHabitos[],
): AtributosPersonales {
  return {
    mentalidad: atributo(semanas, HABITOS_MENTALIDAD),
    disciplina: atributo(semanas, HABITOS_DISCIPLINA),
  };
}
