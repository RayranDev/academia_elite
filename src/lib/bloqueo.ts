import type { TipoBloqueo } from "@/types";

/** Etiquetas de los motivos de bloqueo (UI de gestión). */
export const ETIQUETA_BLOQUEO: Record<TipoBloqueo, string> = {
  PAGO: "Pago pendiente",
  COMPORTAMIENTO: "Mal comportamiento",
  CONTACTA_DT: "Comunícate con tu DT",
  PERSONALIZADO: "Mensaje personalizado",
};

/** Mensajes predefinidos que ve la familia bloqueada en /bloqueado. */
const MENSAJES_BLOQUEO: Record<Exclude<TipoBloqueo, "PERSONALIZADO">, string> = {
  PAGO: "Tu acceso está suspendido por un pago pendiente. Por favor regulariza la situación con la administración de la escuela para volver a entrar.",
  COMPORTAMIENTO:
    "Tu acceso está suspendido temporalmente por un tema de comportamiento. La escuela se pondrá en contacto contigo para resolverlo.",
  CONTACTA_DT:
    "Tu acceso está suspendido. Por favor comunícate con tu director técnico para más información.",
};

/** Resuelve el mensaje a mostrar según el tipo (y el texto personalizado). */
export function mensajeDeBloqueo(
  tipo: string | null,
  mensaje: string | null,
): string {
  if (tipo === "PERSONALIZADO" && mensaje) return mensaje;
  if (tipo && tipo in MENSAJES_BLOQUEO) {
    return MENSAJES_BLOQUEO[tipo as keyof typeof MENSAJES_BLOQUEO];
  }
  return "Tu acceso está suspendido. Comunícate con tu escuela para más información.";
}
