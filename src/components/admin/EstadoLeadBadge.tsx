import { Badge } from "@/components/ui/Badge";
import type { EstadoLead } from "@/types";

// Etiquetas legibles del funnel de leads (punto único de verdad para la UI).
export const LABEL_ESTADO_LEAD: Record<EstadoLead, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  EN_SEGUIMIENTO: "En seguimiento",
  RECONTACTAR: "Recontactar",
  NEGOCIACION: "Negociación",
  PRUEBA_GRATUITA: "Prueba gratuita",
  PENDIENTE_PAGO: "Pendiente de pago",
  CONVERTIDO: "Cliente activo",
  DESCARTADO: "Descartado",
  NO_INTERESADO: "No interesado",
};

function tono(estado: EstadoLead): "pitch" | "alerta" | "neutral" {
  if (estado === "CONVERTIDO") return "pitch";
  if (estado === "DESCARTADO" || estado === "NO_INTERESADO") return "alerta";
  return "neutral";
}

/** Badge con la etiqueta y el tono del estado del lead. */
export function EstadoLeadBadge({ estado }: { estado: EstadoLead }) {
  return <Badge tono={tono(estado)}>{LABEL_ESTADO_LEAD[estado]}</Badge>;
}
