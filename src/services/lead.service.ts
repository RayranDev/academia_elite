import { crearLeadGlobal } from "@/repositories/lead.repository";
import type { LeadInput } from "@/lib/validators/lead";

/**
 * Servicio de leads (Capa 3). Orquesta la creación de un lead desde la landing.
 * La validación Zod, el honeypot y el rate limit viven en la Capa 2 (API).
 */
export async function crearLead(input: LeadInput): Promise<{ id: string }> {
  return crearLeadGlobal(input);
}
