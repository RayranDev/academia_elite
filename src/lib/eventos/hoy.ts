/**
 * Lógica PURA del home "Hoy" del DT: en qué fase está la sesión de cada evento y
 * cuál es la acción principal que corresponde. Sin Prisma ni React, para poder
 * probarla sin levantar nada y para que la tarjeta no decida reglas.
 *
 * La fase es la de la SESIÓN (Modo Sesión), no la del evento: un entrenamiento
 * pasa de hora pero, si el DT nunca abrió el Modo Sesión, sigue "por iniciar".
 */

export type FaseSesionHoy = "POR_INICIAR" | "EN_CURSO" | "CERRADA" | "CANCELADA";

export interface DatosFaseSesion {
  cancelado: boolean;
  sesionIniciadaAt: string | null;
  sesionCerradaAt: string | null;
}

export function faseSesionHoy(e: DatosFaseSesion): FaseSesionHoy {
  if (e.cancelado) return "CANCELADA";
  if (e.sesionCerradaAt) return "CERRADA";
  if (e.sesionIniciadaAt) return "EN_CURSO";
  return "POR_INICIAR";
}

export interface AccionEventoHoy {
  etiqueta: string;
  href: string;
}

/**
 * Acción principal de la tarjeta según la fase. Reusa las rutas que ya existen:
 * el Modo Sesión (`/sesion`) arranca solo al entrar —el servicio fija el inicio
 * la primera vez y es idempotente—, así que "Iniciar" y "Continuar" apuntan al
 * mismo lugar y se distinguen por la etiqueta. Una sesión cerrada no se reabre
 * (la página de sesión redirige), por eso "Ver resumen" va directo al detalle.
 */
export function accionPrincipalHoy(
  eventoId: string,
  fase: FaseSesionHoy,
): AccionEventoHoy | null {
  switch (fase) {
    case "POR_INICIAR":
      return { etiqueta: "Iniciar sesión", href: `/dt/eventos/${eventoId}/sesion` };
    case "EN_CURSO":
      return { etiqueta: "Continuar sesión", href: `/dt/eventos/${eventoId}/sesion` };
    case "CERRADA":
      return { etiqueta: "Ver resumen", href: `/dt/eventos/${eventoId}` };
    case "CANCELADA":
      return null;
  }
}

/** Pasar lista rápido: al detalle, donde vive el formulario de asistencia. */
export function hrefPasarLista(eventoId: string): string {
  return `/dt/eventos/${eventoId}#pasar-lista`;
}

/**
 * Qué evento del día merece el foco cuando hay varios: el que está en curso; si
 * no hay, el primero por iniciar (la lista llega ordenada por hora). Los
 * cerrados y cancelados nunca lo reciben.
 */
export function eventoDestacadoId(
  eventos: { id: string; fase: FaseSesionHoy }[],
): string | null {
  return (
    eventos.find((e) => e.fase === "EN_CURSO")?.id ??
    eventos.find((e) => e.fase === "POR_INICIAR")?.id ??
    null
  );
}
