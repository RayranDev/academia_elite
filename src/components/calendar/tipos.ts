import {
  Dumbbell,
  Trophy,
  ClipboardCheck,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import type { TipoEvento } from "@/types";

// Clases de tema (no hex hardcodeado): cada tipo mapea a un token de @theme
// ya existente, así que sigue el color real del tema en vez de duplicarlo.
export const TEXTO_TIPO: Record<TipoEvento, string> = {
  ENTRENAMIENTO: "text-pitch",
  PARTIDO: "text-oro",
  EVALUACION: "text-heroe",
  OTRO: "text-info",
};

export const FONDO_TIPO: Record<TipoEvento, string> = {
  ENTRENAMIENTO: "bg-pitch",
  PARTIDO: "bg-oro",
  EVALUACION: "bg-heroe",
  OTRO: "bg-info",
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
