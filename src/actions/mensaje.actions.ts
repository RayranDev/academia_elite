"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  crearConversacionSchema,
  responderSchema,
  anuncioSchema,
} from "@/lib/validators/mensaje";
import {
  crearConversacion,
  responder,
  publicarAnuncio,
  eliminarAnuncio,
} from "@/services/mensaje.service";
import { marcarNotificacionLeida } from "@/services/notificacion.service";

function primerError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Datos inválidos.";
}

export async function crearConversacionAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = crearConversacionSchema.safeParse({
      jugadorId: formData.get("jugadorId"),
      asunto: formData.get("asunto"),
      cuerpo: formData.get("cuerpo"),
    });
    if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
    const res = await crearConversacion(
      ctx,
      parsed.data.jugadorId,
      parsed.data.asunto,
      parsed.data.cuerpo,
    );
    revalidatePath("/dt/mensajes");
    revalidatePath("/jugador/mensajes");
    return { ok: true, data: res };
  } catch (e) {
    return mapError(e);
  }
}

export async function responderAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = responderSchema.safeParse({
    conversacionId: formData.get("conversacionId"),
    cuerpo: formData.get("cuerpo"),
  });
  if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
  await responder(ctx, parsed.data.conversacionId, parsed.data.cuerpo);
  revalidatePath(`/dt/mensajes/${parsed.data.conversacionId}`);
  revalidatePath(`/jugador/mensajes/${parsed.data.conversacionId}`);
}

export async function publicarAnuncioAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = anuncioSchema.safeParse({
    categoriaId: formData.get("categoriaId") || undefined,
    titulo: formData.get("titulo"),
    cuerpo: formData.get("cuerpo"),
    visibleJugador: formData.get("visibleJugador") === "on",
    fijado: formData.get("fijado") === "on",
  });
  if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
  await publicarAnuncio(ctx, {
    categoriaId: parsed.data.categoriaId || undefined,
    titulo: parsed.data.titulo,
    cuerpo: parsed.data.cuerpo,
    visibleJugador: parsed.data.visibleJugador,
    fijado: parsed.data.fijado,
  });
  revalidatePath("/dt/mensajes");
  revalidatePath("/escuela/anuncios");
}

export async function eliminarAnuncioAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const id = formData.get("anuncioId");
    if (typeof id !== "string" || !id) {
      throw new ValidationError("Anuncio inválido.");
    }
    await eliminarAnuncio(ctx, id);
    revalidatePath("/dt/mensajes");
    revalidatePath("/escuela/anuncios");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function marcarNotificacionLeidaAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuthContext();
  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await marcarNotificacionLeida(ctx, id);
  }
}
