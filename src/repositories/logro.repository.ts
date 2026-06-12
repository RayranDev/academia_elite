import { db } from "@/lib/db";

// Repositorio de logros y su configuración por escuela (Capa 4).

/** Catálogo global + logros propios de la escuela (si se indica). */
export function listarCatalogo(escuelaId?: string) {
  return db.logro.findMany({
    where: escuelaId
      ? { OR: [{ escuelaId: null }, { escuelaId }] }
      : { escuelaId: null },
    orderBy: [{ posicion: "asc" }, { codigo: "asc" }],
  });
}

export function obtenerLogro(id: string) {
  return db.logro.findUnique({ where: { id } });
}

export function codigoLogroExiste(codigo: string) {
  return db.logro.findUnique({ where: { codigo }, select: { id: true } });
}

export function crearLogro(data: {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  statBonus: string | null;
  valorBonus: number | null;
  repetible: boolean;
  icono: string;
  posicion: string | null;
  escuelaId: string | null;
}) {
  return db.logro.create({ data, select: { id: true } });
}

export function actualizarLogro(
  id: string,
  data: { nombre?: string; descripcion?: string; activo?: boolean },
) {
  return db.logro.update({ where: { id }, data, select: { id: true } });
}

/** Configuración por escuela (ventanas/activación) de todos sus logros. */
export function listarConfigLogrosEscuela(escuelaId: string) {
  return db.logroEscuela.findMany({ where: { escuelaId } });
}

export function configurarLogroEscuela(
  escuelaId: string,
  logroId: string,
  data: { activo: boolean; desde: Date | null; hasta: Date | null },
) {
  return db.logroEscuela.upsert({
    where: { escuelaId_logroId: { escuelaId, logroId } },
    create: { escuelaId, logroId, ...data },
    update: data,
  });
}

export function otorgarLogroJugador(
  escuelaId: string,
  jugadorId: string,
  logroId: string,
) {
  return db.logroJugador.create({
    data: { escuelaId, jugadorId, logroId },
    select: { id: true },
  });
}

export function jugadorTieneLogro(jugadorId: string, logroId: string) {
  return db.logroJugador.findFirst({
    where: { jugadorId, logroId },
    select: { id: true },
  });
}
