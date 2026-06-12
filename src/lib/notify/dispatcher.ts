import type { TipoNotificacion } from "@/types";

/**
 * Despachador de notificaciones multicanal (G9).
 *
 * Fase 1 solo implementa INAPP (lo registra `notificacion.service` al cargar).
 * EMAIL y WHATSAPP quedan como canales declarados sin implementación: en
 * Fase 2 se registra un `CanalNotificacion` real (p. ej. Resend / WhatsApp
 * Cloud API) sin tocar a los llamadores — todos pasan por `despachar()`.
 *
 * Regla de capas: este módulo no importa servicios ni repositorios; los
 * canales concretos se registran desde la capa de servicios (inyección).
 */

export type CanalTipo = "INAPP" | "EMAIL" | "WHATSAPP";

export interface MensajeNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo?: string;
  url?: string;
}

export interface CanalNotificacion {
  canal: CanalTipo;
  enviar(userIds: string[], mensaje: MensajeNotificacion): Promise<void>;
}

const canales = new Map<CanalTipo, CanalNotificacion>();

export function registrarCanal(canal: CanalNotificacion): void {
  canales.set(canal.canal, canal);
}

/**
 * Envía el mensaje por los canales pedidos. Los canales sin implementación
 * registrada se ignoran en silencio (stubs de Fase 2): el flujo nunca se cae
 * por un canal no disponible.
 */
export async function despachar(
  userIds: string[],
  mensaje: MensajeNotificacion,
  porCanales: CanalTipo[] = ["INAPP"],
): Promise<void> {
  const unicos = [...new Set(userIds.filter(Boolean))];
  if (unicos.length === 0) return;
  for (const tipo of porCanales) {
    const canal = canales.get(tipo);
    if (!canal) continue; // EMAIL/WHATSAPP: pendientes de Fase 2
    await canal.enviar(unicos, mensaje);
  }
}
