import { DomainError } from "@/lib/errors";

// Contrato de retorno de las Server Actions (Sección 14): mensaje seguro para UI.
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Señales de control de flujo de Next (redirect / notFound): no deben tratarse
 *  como errores, hay que re-lanzarlas para que el framework las procese. */
function esSenalDeControlNext(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (e as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

/** Mapea errores a un resultado seguro. Los de dominio exponen su mensaje;
 *  cualquier otro se registra en servidor y devuelve un mensaje genérico. */
export function mapError(e: unknown): { ok: false; error: string } {
  if (esSenalDeControlNext(e)) throw e;
  if (e instanceof DomainError) return { ok: false, error: e.message };
  console.error("[action] error inesperado:", e);
  return { ok: false, error: "Ocurrió un error. Inténtalo de nuevo." };
}
