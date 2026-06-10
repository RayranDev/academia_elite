import { DomainError } from "@/lib/errors";

// Contrato de retorno de las Server Actions (Sección 14): mensaje seguro para UI.
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Mapea errores a un resultado seguro. Los de dominio exponen su mensaje;
 *  cualquier otro se registra en servidor y devuelve un mensaje genérico. */
export function mapError(e: unknown): { ok: false; error: string } {
  if (e instanceof DomainError) return { ok: false, error: e.message };
  console.error("[action] error inesperado:", e);
  return { ok: false, error: "Ocurrió un error. Inténtalo de nuevo." };
}
