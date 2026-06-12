import type { PlayerCardData, Nivel } from "@/types";

/**
 * Datos demo para la carta de la landing (sin tocar la BD). El slider de la
 * demo en vivo interpola entre estos cuatro niveles para mostrar la progresiÃ³n.
 */
const NIVELES_DEMO: Record<Nivel, PlayerCardData> = {
  BRONCE: {
    nombre: "Lucas GarcÃ­a",
    posicion: "DEL",
    ovr: 58,
    nivel: "BRONCE",
    stats: { rit: 62, tir: 55, pas: 50, reg: 60, def: 38, fis: 54 },
    men: 60,
    fotoUrl: "/nino_carta.png",
    dorsal: 9,
  },
  PLATA: {
    nombre: "Lucas GarcÃ­a",
    posicion: "DEL",
    ovr: 70,
    nivel: "PLATA",
    stats: { rit: 74, tir: 68, pas: 62, reg: 72, def: 44, fis: 66 },
    men: 71,
    fotoUrl: "/nino_carta.png",
    dorsal: 9,
  },
  ORO: {
    nombre: "Lucas GarcÃ­a",
    posicion: "DEL",
    ovr: 80,
    nivel: "ORO",
    stats: { rit: 84, tir: 80, pas: 70, reg: 82, def: 50, fis: 74 },
    men: 82,
    fotoUrl: "/nino_carta.png",
    dorsal: 9,
  },
  HEROE: {
    nombre: "Lucas GarcÃ­a",
    posicion: "DEL",
    ovr: 89,
    nivel: "HEROE",
    stats: { rit: 92, tir: 88, pas: 78, reg: 90, def: 56, fis: 82 },
    men: 90,
    fotoUrl: "/nino_carta.png",
    dorsal: 9,
    heroeEquipado: true, // escaparate: muestra el marco especial de Héroe
  },
};

export const NIVELES_ORDEN: Nivel[] = ["BRONCE", "PLATA", "ORO", "HEROE"];

export function cartaDemo(nivel: Nivel): PlayerCardData {
  return NIVELES_DEMO[nivel];
}
