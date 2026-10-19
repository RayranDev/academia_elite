"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { aceptarPoliticaSchema } from "@/lib/validators/politica";
import { aceptarPolitica } from "@/services/politica.service";

/**
 * Aceptación de la Política en el primer ingreso de la familia. Frontera:
 * sesión (AuthContext, nunca del body) + Zod; el rol y la idempotencia viven en
 * el servicio. `permitirBloqueado`: una familia bloqueada por mora que nunca
 * aceptó igual debe poder hacerlo (el panel limitado la espera después).
 *
 * Tras sellar, redirige a /jugador: la redirección ES la respuesta visible. El
 * `redirect` va fuera del try porque lanza una señal de control de Next.
 */
export async function aceptarPoliticaAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext({ permitirBloqueado: true });
    const parsed = aceptarPoliticaSchema.safeParse({
      aceptaTerminos: formData.get("aceptaTerminos"),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Debes aceptar la Política para continuar.",
      );
    }
    await aceptarPolitica(ctx);
  } catch (e) {
    return mapError(e);
  }
  // El layout de /jugador lee la aceptación de la base en cada render; se
  // invalida el árbol para no servir desde la caché del router una redirección
  // previa a /aceptar-politica.
  revalidatePath("/jugador", "layout");
  redirect("/jugador");
}
