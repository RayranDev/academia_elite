import type { AuthContext } from "@/lib/auth/context";
import { requireRole, requireEscuela } from "@/lib/auth/guards";
import { ForbiddenError } from "@/lib/errors";
import { categoriaIdsDeEntrenador } from "@/repositories/entrenador.repository";

/** Exige rol DT con entrenador y escuela; devuelve sus identificadores. */
export function requireDtScope(ctx: AuthContext): {
  escuelaId: string;
  entrenadorId: string;
} {
  requireRole(ctx, ["DT"]);
  const escuelaId = requireEscuela(ctx);
  if (!ctx.entrenadorId) throw new ForbiddenError();
  return { escuelaId, entrenadorId: ctx.entrenadorId };
}

/** Ids de las categorías que el DT tiene asignadas. */
export async function categoriasDelDt(ctx: AuthContext): Promise<{
  escuelaId: string;
  entrenadorId: string;
  categoriaIds: string[];
}> {
  const scope = requireDtScope(ctx);
  const categoriaIds = await categoriaIdsDeEntrenador(scope.entrenadorId);
  return { ...scope, categoriaIds };
}
