import {
  Dumbbell,
  Trophy,
  ClipboardCheck,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
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

/** Icono minimalista por tipo de evento (se pinta con el color del tipo). */
export const ICONO_TIPO: Record<TipoEvento, LucideIcon> = {
  ENTRENAMIENTO: Dumbbell,
  PARTIDO: Trophy,
  EVALUACION: ClipboardCheck,
  OTRO: CalendarDays,
};
