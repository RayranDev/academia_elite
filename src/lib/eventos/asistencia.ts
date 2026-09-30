/**
 * Lógica PURA de la lista de asistencia del detalle del evento: contadores y
 * textos de confirmación. Sin Prisma ni React, para probarla sin levantar nada
 * y para que el formulario y la acción digan exactamente lo mismo.
 */

export interface RegistroAsistencia {
  jugadorId: string;
  presente: boolean;
}

/** Lo que devuelve el servicio al guardar la lista. */
export interface ResultadoAsistencia {
  presentes: number;
  /** Jugadores efectivamente guardados (presentes + ausentes). */
  total: number;
  /** Enviados que no se guardaron por no pertenecer ya al plantel de la categoría. */
  omitidos: number;
}

export function contarPresentes(registros: RegistroAsistencia[]): number {
  return registros.filter((r) => r.presente).length;
}

/** Resumen de un guardado: `enviados` son los registros recibidos, `guardados` los válidos. */
export function resumirAsistencia(
  enviados: RegistroAsistencia[],
  guardados: RegistroAsistencia[],
): ResultadoAsistencia {
  return {
    presentes: contarPresentes(guardados),
    total: guardados.length,
    omitidos: enviados.length - guardados.length,
  };
}

/** Contador vivo del formulario: "3 de 12 presentes". */
export function textoContadorAsistencia(presentes: number, total: number): string {
  return `${presentes} de ${total} ${total === 1 ? "presente" : "presentes"}`;
}

/** Confirmación tras guardar: "Asistencia guardada: 3 presentes de 12." */
export function mensajeAsistenciaGuardada(r: ResultadoAsistencia): string {
  const base = `Asistencia guardada: ${r.presentes} ${
    r.presentes === 1 ? "presente" : "presentes"
  } de ${r.total}.`;
  if (r.omitidos === 0) return base;
  const plural = r.omitidos === 1;
  return `${base} ${r.omitidos} ${
    plural ? "jugador no se guardó porque ya no está" : "jugadores no se guardaron porque ya no están"
  } en el plantel de la categoría.`;
}

/**
 * Lee el FormData de la lista: los ids viajan en `jugadores` y cada presente
 * en `presente_<id>` (checkbox marcado = "on"). Descarta ids repetidos —un
 * request armado a mano podría mandar el mismo jugador dos veces— y vacíos.
 */
export function leerRegistrosAsistencia(formData: FormData): RegistroAsistencia[] {
  const vistos = new Set<string>();
  const registros: RegistroAsistencia[] = [];
  for (const valor of formData.getAll("jugadores")) {
    const jugadorId = typeof valor === "string" ? valor : "";
    if (!jugadorId || vistos.has(jugadorId)) continue;
    vistos.add(jugadorId);
    registros.push({
      jugadorId,
      presente: formData.get(`presente_${jugadorId}`) === "on",
    });
  }
  return registros;
}
