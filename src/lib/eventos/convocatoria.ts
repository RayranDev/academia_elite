import type { Confirmacion } from "@/types";

/**
 * Mensaje de éxito que ve la familia al responder una convocatoria. El estado
 * (insignia "Asistencia confirmada" / "No asistirá") ya cambia en pantalla, pero
 * un mensaje explícito junto al botón cierra la duda de "¿se guardó?" y deja
 * claro que el entrenador ya lo puede ver.
 */
export function mensajeRespuestaConvocatoria(confirmacion: Confirmacion): string {
  switch (confirmacion) {
    case "CONFIRMADO":
      return "Listo, confirmaste la asistencia. El entrenador ya lo ve.";
    case "RECHAZADO":
      return "Listo, avisaste que no asistirá. El entrenador ya lo ve.";
    case "PENDIENTE":
      return "Listo, la respuesta quedó pendiente.";
  }
}
