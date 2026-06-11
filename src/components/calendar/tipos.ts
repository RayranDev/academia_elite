import type { TipoEvento } from "@/types";

export const COLOR_TIPO: Record<TipoEvento, string> = {
  ENTRENAMIENTO: "#4ADE80",
  PARTIDO: "#F5C542",
  EVALUACION: "#A78BFA",
  OTRO: "#60A5FA",
};

export const ETIQUETA_TIPO: Record<TipoEvento, string> = {
  ENTRENAMIENTO: "Entrenamiento",
  PARTIDO: "Partido",
  EVALUACION: "Evaluación",
  OTRO: "Otro",
};
