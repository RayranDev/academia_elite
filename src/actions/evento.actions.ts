"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  eventoSchema,
  confirmarConvocatoriaSchema,
  resultadoSchema,
} from "@/lib/validators/evento";
import {
  crearEventoDt,
  confirmarConvocatoria,
  pasarListaDt,
  cargarResultadoDt,
} from "@/services/evento.service";

function primerError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Datos inválidos.";
}

export async function crearEventoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = eventoSchema.safeParse({
      categoriaId: formData.get("categoriaId"),
      tipo: formData.get("tipo"),
      titulo: formData.get("titulo"),
      canchaId: formData.get("canchaId") || undefined,
      rival: formData.get("rival") || undefined,
      esLocal: formData.get("esLocal") === "on" ? true : formData.get("esLocal"),
      inicio: formData.get("inicio"),
      fin: formData.get("fin"),
      notas: formData.get("notas") || undefined,
      convocados: formData.getAll("convocados").map(String),
      repetirSemanal: formData.get("repetirSemanal") === "on",
      repetirHasta: formData.get("repetirHasta") || undefined,
    });
    if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
    await crearEventoDt(ctx, parsed.data);
    revalidatePath("/dt/calendario");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function confirmarConvocatoriaAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = confirmarConvocatoriaSchema.safeParse({
    eventoId: formData.get("eventoId"),
    jugadorId: formData.get("jugadorId"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!parsed.success) throw new ValidationError("Datos inválidos.");
  await confirmarConvocatoria(
    ctx,
    parsed.data.eventoId,
    parsed.data.jugadorId,
    parsed.data.confirmacion,
  );
  revalidatePath("/jugador");
}

export async function pasarListaAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const eventoId = formData.get("eventoId");
  if (typeof eventoId !== "string" || !eventoId) {
    throw new ValidationError("Evento inválido.");
  }
  // jugadorIds vienen en "jugadores"; presentes marcados en "presente_<id>".
  const jugadorIds = formData.getAll("jugadores").map(String);
  const registros = jugadorIds.map((jugadorId) => ({
    jugadorId,
    presente: formData.get(`presente_${jugadorId}`) === "on",
  }));
  await pasarListaDt(ctx, eventoId, registros);
  revalidatePath(`/dt/eventos/${eventoId}`);
}

export async function cargarResultadoAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = resultadoSchema.safeParse({
    eventoId: formData.get("eventoId"),
    resultadoLocal: formData.get("resultadoLocal"),
    resultadoVisitante: formData.get("resultadoVisitante"),
  });
  if (!parsed.success) throw new ValidationError("Resultado inválido.");
  await cargarResultadoDt(
    ctx,
    parsed.data.eventoId,
    parsed.data.resultadoLocal,
    parsed.data.resultadoVisitante,
  );
  revalidatePath(`/dt/eventos/${parsed.data.eventoId}`);
}
