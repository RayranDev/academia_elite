import type { AuthContext } from "@/lib/auth/context";
import { assertTenant } from "@/lib/auth/guards";
import { DomainError } from "@/lib/errors";
import { leerFoto } from "@/lib/foto/storage";
import { obtenerEscuela } from "@/repositories/escuela.repository";

// Servicio aparte de `escuela.service.ts` a propósito: ese módulo arrastra
// `sharp` (procesamiento de imagen, nativo) y la ruta que solo SIRVE el escudo
// no debe cargarlo (mismo motivo que `lib/foto/permisos.ts`).

/**
 * Escudo (PNG) de una escuela para usuarios con sesión. Aplica `assertTenant`:
 * el propio tenant, o un SUPER_ADMIN con sesión de soporte abierta para ESA
 * escuela (sin acceso ambiental, AGENTS.md §5). Devuelve `null` si no
 * corresponde o la escuela no tiene escudo, para que la ruta responda un 404
 * uniforme sin confirmar si existe.
 */
export async function obtenerEscudoEscuela(
  ctx: AuthContext,
  escuelaId: string,
): Promise<Buffer | null> {
  try {
    assertTenant(ctx, escuelaId);
  } catch (e) {
    if (e instanceof DomainError) return null;
    throw e;
  }
  const escuela = await obtenerEscuela(escuelaId);
  if (!escuela?.logoUrl) return null;
  return leerFoto(escuela.logoUrl);
}
