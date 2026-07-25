import type { PlayerCardData, Posicion, Nivel } from "@/types";
import { parseAvatarConfig } from "@/lib/avatar/config";

interface StatsRow {
  rit: number;
  tir: number;
  pas: number;
  reg: number;
  def: number;
  fis: number;
  men: number;
  ovr: number;
  nivel: string;
}

interface JugadorRow {
  nombre: string;
  apellido: string;
  posicion: string;
  dorsal: number | null;
  fotoUrl: string | null;
  avatarConfig?: string | null;
}

// Piso de una carta recién nacida (sin evaluación aún): valores base modestos
// de nivel Bronce, para que el jugador vea YA su carta inicial.
const STAT_INICIAL = 45;

/**
 * Carta inicial nivel Bronce para un jugador SIN evaluación: usa su nombre,
 * posición, dorsal y foto/avatar reales, con stats en un valor base. La UI la
 * rotula "carta inicial · sin evaluación" para que quede claro que es provisoria.
 */
export function cartaInicialBronce(
  jugador: JugadorRow,
  fotoUrl: string | null,
  escudoEscuelaUrl?: string,
): PlayerCardData {
  return {
    nombre: jugador.nombre,
    apellido: jugador.apellido,
    posicion: jugador.posicion as Posicion,
    ovr: STAT_INICIAL,
    nivel: "BRONCE",
    stats: {
      rit: STAT_INICIAL,
      tir: STAT_INICIAL,
      pas: STAT_INICIAL,
      reg: STAT_INICIAL,
      def: STAT_INICIAL,
      fis: STAT_INICIAL,
    },
    men: 50,
    fotoUrl,
    escudoEscuelaUrl,
    dorsal: jugador.dorsal ?? undefined,
    avatarConfig: parseAvatarConfig(jugador.avatarConfig),
  };
}

/** Construye el DTO plano de la carta desde el jugador + su snapshot de stats. */
export function aPlayerCardData(
  jugador: JugadorRow,
  stats: StatsRow,
  fotoUrl: string | null,
  escudoEscuelaUrl?: string,
): PlayerCardData {
  return {
    nombre: jugador.nombre,
    apellido: jugador.apellido,
    posicion: jugador.posicion as Posicion,
    ovr: stats.ovr,
    nivel: stats.nivel as Nivel,
    stats: {
      rit: stats.rit,
      tir: stats.tir,
      pas: stats.pas,
      reg: stats.reg,
      def: stats.def,
      fis: stats.fis,
    },
    men: stats.men,
    fotoUrl,
    escudoEscuelaUrl,
    dorsal: jugador.dorsal ?? undefined,
    avatarConfig: parseAvatarConfig(jugador.avatarConfig),
  };
}
