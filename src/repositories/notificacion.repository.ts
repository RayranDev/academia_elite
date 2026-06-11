import { db } from "@/lib/db";

export interface NotificacionData {
  userId: string;
  tipo: string;
  titulo: string;
  cuerpo?: string | null;
  url?: string | null;
}

export function crearNotificaciones(datos: NotificacionData[]) {
  if (datos.length === 0) return Promise.resolve({ count: 0 });
  return db.notificacion.createMany({ data: datos });
}

export function listarNotificaciones(userId: string, limite = 30) {
  return db.notificacion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limite,
  });
}

export function contarNoLeidas(userId: string) {
  return db.notificacion.count({ where: { userId, leida: false } });
}

export function marcarLeida(userId: string, id: string) {
  return db.notificacion.updateMany({
    where: { id, userId },
    data: { leida: true },
  });
}

export function marcarTodasLeidas(userId: string) {
  return db.notificacion.updateMany({
    where: { userId, leida: false },
    data: { leida: true },
  });
}
