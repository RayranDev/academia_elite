"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import {
  altaJugadorSchema,
  altaJugadorDesdeFormData,
} from "@/lib/validators/alta-jugador";
import {
  crearJugadorCompleto,
  type ResultadoAltaJugador,
} from "@/services/alta-jugador.service";

/**
 * Alta completa de un jugador (identidad, ficha y acudiente) para el DT, la
 * escuela y el Súper Admin en soporte. Frontera: sesión + rate limit + Zod; la
 * autorización real (rol, tenant, alcance sobre la ficha) vive en el servicio.
 *
 * Se invoca IMPERATIVAMENTE desde el formulario por pasos, que conserva todo lo
 * escrito si hay un error: por eso devuelve `ActionResult` y no redirige.
 */
export async function crearJugadorCompletoAction(
  formData: FormData,
): Promise<ActionResult<ResultadoAltaJugador>> {
  try {
    const ctx = await requireAuthContext();
    // Crea cuentas con contraseña: un tope por usuario frena el abuso del endpoint.
    const limite = await rateLimit(`alta-jugador:${ctx.userId}`, 60, 60 * 60 * 1000);
    if (!limite.ok) {
      throw new ValidationError("Demasiadas altas seguidas. Espera un momento.");
    }

    const parsed = altaJugadorSchema.safeParse(altaJugadorDesdeFormData(formData));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    }

    const data = await crearJugadorCompleto(ctx, parsed.data);

    // Lo ven la plantilla y el Hoy del DT, y las listas de la escuela y del
    // Súper Admin en soporte.
    revalidatePath("/dt", "layout");
    revalidatePath("/escuela/jugadores", "layout");
    revalidatePath("/admin/escuelas", "layout");
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}
