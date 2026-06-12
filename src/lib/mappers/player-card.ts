import type { PlayerCardData, Posicion, Nivel, AvatarConfig } from "@/types";

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

function parseAvatar(raw?: string | null): AvatarConfig | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as AvatarConfig;
    if (typeof v?.piel === "number" && typeof v?.peinado === "number") return v;
  } catch {
    /* config inválida → avatar por seed */
  }
  return null;
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
    avatarConfig: parseAvatar(jugador.avatarConfig),
  };
}
