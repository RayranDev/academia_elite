import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";
import { requireRole, assertTenant } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import {
  listarHijos,
  obtenerJugadorHub,
} from "@/repositories/jugador.repository";
import { listarEvaluacionesJugador } from "@/repositories/evaluacion.repository";
import { noticiasDeJugador } from "@/repositories/anuncio.repository";
import { obtenerEscuela } from "@/repositories/escuela.repository";
import {
  proximosEventosJugador,
  ultimoPartidoJugador,
  resumenPartidosJugador,
  type ProximoEventoDTO,
  type UltimoPartidoDTO,
  type ResumenPartidosDTO,
} from "@/services/evento.service";
import { aPlayerCardData } from "@/lib/mappers/player-card";
import { obtenerFondo } from "@/repositories/fondo.repository";
import { parseAvatarConfig } from "@/lib/avatar/config";
import type { PlayerCardData, Posicion, AvatarConfig } from "@/types";

export interface NoticiaDTO {
  id: string;
  titulo: string;
  cuerpo: string;
  fecha: string;
}

export interface HijoRef {
  id: string;
  nombre: string;
  apellido: string;
}
export interface EvolucionPunto {
  fecha: string;
  ovr: number;
  rit: number;
  tir: number;
  pas: number;
  reg: number;
  def: number;
  fis: number;
  men: number;
}
export interface InsigniaDTO {
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  obtenido: boolean;
  fecha?: string;
}
export interface BonusDTO {
  nombre: string;
  stat: string;
  valor: number;
  consumido: boolean;
  fecha: string;
}
export interface ObjetivoDTO {
  id: string;
  stat: string;
  valorMeta: number;
  valorActual: number;
  progreso: number;
  fechaLimite: string;
  estado: string;
}
export interface HubDTO {
  jugadorId: string;
  nombre: string;
  apellido: string;
  posicion: Posicion;
  categoriaNombre: string;
  estado: string;
  card: PlayerCardData | null;
  bonusUltima: number;
  hijos: HijoRef[];
  evolucion: EvolucionPunto[];
  insignias: InsigniaDTO[];
  bonus: BonusDTO[];
  objetivos: ObjetivoDTO[];
  foto: { tieneFoto: boolean; consentimiento: boolean };
  avatarConfig: AvatarConfig | null;
  proximos: ProximoEventoDTO[];
  ultimoPartido: UltimoPartidoDTO | null;
  resumenPartidos: ResumenPartidosDTO;
  noticias: NoticiaDTO[];
}


export async function obtenerHub(
  ctx: AuthContext,
  jugadorId?: string,
): Promise<HubDTO> {
  requireRole(ctx, ["JUGADOR"]);
  const hijos = await listarHijos(ctx.userId);
  if (hijos.length === 0) {
    throw new NotFoundError("No hay jugadores vinculados a tu cuenta.");
  }
  const elegido = jugadorId
    ? hijos.find((h) => h.id === jugadorId)
    : hijos[0];
  if (!elegido) throw new NotFoundError("Jugador no encontrado.");
  assertTenant(ctx, elegido.escuelaId);

  const [full, evals, catalogo, proximos, ultimoPartido, resumenPartidos, noticiasRows, escuela] =
    await Promise.all([
      obtenerJugadorHub(elegido.id),
      listarEvaluacionesJugador(elegido.escuelaId, elegido.id),
      db.logro.findMany({ where: { tipo: "INSIGNIA" }, orderBy: { codigo: "asc" } }),
      proximosEventosJugador(elegido.escuelaId, elegido.categoriaId, elegido.id),
      ultimoPartidoJugador(elegido.escuelaId, elegido.categoriaId),
      resumenPartidosJugador(elegido.escuelaId, elegido.id),
      noticiasDeJugador(elegido.escuelaId, elegido.categoriaId),
      obtenerEscuela(elegido.escuelaId),
    ]);
  if (!full) throw new NotFoundError("Jugador no encontrado.");

  const stats = full.stats[0] ?? null;
  // `?v=<archivo>`: el nombre del archivo (UUID) cambia en cada subida, así que
  // sirve de cache-buster para que el navegador muestre la foto nueva al instante.
  const fotoUrl =
    full.consentimientoFoto && full.fotoUrl
      ? `/api/archivos/foto/${full.id}?v=${encodeURIComponent(full.fotoUrl)}`
      : null;
  const escudoUrl = escuela?.logoUrl
    ? `/api/archivos/escudo/${elegido.escuelaId}`
    : undefined;
  const card = stats ? aPlayerCardData(full, stats, fotoUrl, escudoUrl) : null;
  // Fondo desbloqueado y equipado por el jugador (detrás del retrato). El marco
  // Héroe (morado) solo se activa si el fondo equipado es el especial "LEYENDA".
  if (card && elegido.fondoEquipadoId) {
    const fondo = await obtenerFondo(elegido.fondoEquipadoId);
    card.fondoEstilo = fondo?.estilo ?? null;
    card.fondoTexto = fondo?.colorTexto ?? null;
    card.heroeEquipado = fondo?.codigo === "LEYENDA";
  }

  const evolucion: EvolucionPunto[] = evals
    .filter((e) => e.statsCalculados)
    .map((e) => {
      const s = e.statsCalculados!;
      return {
        fecha: e.fecha.toISOString(),
        ovr: s.ovr,
        rit: s.rit,
        tir: s.tir,
        pas: s.pas,
        reg: s.reg,
        def: s.def,
        fis: s.fis,
        men: s.men,
      };
    });

  const valorStat = (stat: string): number => {
    if (!stats) return 0;
    const mapa: Record<string, number> = {
      RIT: stats.rit,
      TIR: stats.tir,
      PAS: stats.pas,
      REG: stats.reg,
      DEF: stats.def,
      FIS: stats.fis,
      MEN: stats.men,
      OVR: stats.ovr,
    };
    return mapa[stat] ?? 0;
  };

  const objetivos: ObjetivoDTO[] = full.objetivos.map((o) => {
    const actual = valorStat(o.stat);
    const progreso = Math.min(
      100,
      Math.max(0, Math.round((actual / o.valorMeta) * 100)),
    );
    return {
      id: o.id,
      stat: o.stat,
      valorMeta: o.valorMeta,
      valorActual: actual,
      progreso,
      fechaLimite: o.fechaLimite.toISOString(),
      estado: o.estado,
    };
  });

  const insignias: InsigniaDTO[] = catalogo.map((l) => {
    const lj = full.logros.find((x) => x.logroId === l.id);
    return {
      codigo: l.codigo,
      nombre: l.nombre,
      descripcion: l.descripcion,
      icono: l.icono,
      obtenido: !!lj,
      fecha: lj ? lj.otorgadoEn.toISOString() : undefined,
    };
  });

  const bonus: BonusDTO[] = full.logros
    .filter((lj) => lj.logro.tipo === "BONUS")
    .map((lj) => ({
      nombre: lj.logro.nombre,
      stat: lj.logro.statBonus ?? "",
      valor: lj.logro.valorBonus ?? 0,
      consumido: lj.bonusConsumido,
      fecha: lj.otorgadoEn.toISOString(),
    }));

  return {
    jugadorId: full.id,
    nombre: full.nombre,
    apellido: full.apellido,
    posicion: full.posicion as Posicion,
    categoriaNombre: full.categoria.nombre,
    estado: full.estado,
    card,
    bonusUltima: stats?.bonusAplicado ?? 0,
    hijos: hijos.map((h) => ({
      id: h.id,
      nombre: h.nombre,
      apellido: h.apellido,
    })),
    evolucion,
    insignias,
    bonus,
    objetivos,
    foto: {
      tieneFoto: !!full.fotoUrl,
      consentimiento: full.consentimientoFoto,
    },
    avatarConfig: parseAvatarConfig(full.avatarConfig),
    proximos,
    ultimoPartido,
    resumenPartidos,
    noticias: noticiasRows.map((n) => ({
      id: n.id,
      titulo: n.titulo,
      cuerpo: n.cuerpo,
      fecha: n.createdAt.toISOString(),
    })),
  };
}
