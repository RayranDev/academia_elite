"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import {
  eventoSchema,
  confirmarConvocatoriaSchema,
  resultadoSchema,
  editarEventoSchema,
  estadisticaSchema,
  pasarListaSchema,
} from "@/lib/validators/evento";
import {
  leerRegistrosAsistencia,
  type ResultadoAsistencia,
} from "@/lib/eventos/asistencia";
import {
  crearEventoDt,
  confirmarConvocatoria,
  pasarListaDt,
  cargarResultadoDt,
  cargarEstadisticasDt,
  editarEventoDt,
  cancelarEventoDt,
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
    // El home "Hoy" lista los eventos del dia: tambien se invalida.
    revalidatePath("/dt");
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
  revalidatePath("/jugador/calendario");
  revalidatePath(`/jugador/eventos/${parsed.data.eventoId}`);
}

/**
 * Guarda la lista de asistencia del detalle del evento. Devuelve cuántos
 * presentes de cuántos quedaron guardados para que el formulario lo confirme
 * (useActionState): un guardado que recarga la página sin decir nada obliga al
 * DT a dudar de si pasó algo.
 */
export async function pasarListaAction(
  _prev: ActionResult<ResultadoAsistencia> | undefined,
  formData: FormData,
): Promise<ActionResult<ResultadoAsistencia>> {
  try {
    const ctx = await requireAuthContext();
    // jugadorIds vienen en "jugadores"; presentes marcados en "presente_<id>".
    const parsed = pasarListaSchema.safeParse({
      eventoId: formData.get("eventoId"),
      registros: leerRegistrosAsistencia(formData),
    });
    if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
    const resultado = await pasarListaDt(
      ctx,
      parsed.data.eventoId,
      parsed.data.registros,
    );
    revalidatePath(`/dt/eventos/${parsed.data.eventoId}`);
    return { ok: true, data: resultado };
  } catch (e) {
    return mapError(e);
  }
}

export async function cargarResultadoAction(
  formData: FormData,
): Promise<ActionResult<{ local: number; visitante: number }>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = resultadoSchema.safeParse({
      eventoId: formData.get("eventoId"),
      resultadoLocal: formData.get("resultadoLocal"),
      resultadoVisitante: formData.get("resultadoVisitante"),
    });
    if (!parsed.success) {
      throw new ValidationError("Resultado inválido: usa números de 0 a 99.");
    }
    await cargarResultadoDt(
      ctx,
      parsed.data.eventoId,
      parsed.data.resultadoLocal,
      parsed.data.resultadoVisitante,
    );
    revalidatePath(`/dt/eventos/${parsed.data.eventoId}`);
    return {
      ok: true,
      data: {
        local: parsed.data.resultadoLocal,
        visitante: parsed.data.resultadoVisitante,
      },
    };
  } catch (e) {
    return mapError(e);
  }
}

/** Lee la tabla de estadística del FormData (o lanza ValidationError). Compartido
 *  por la tabla del detalle del evento y la del cierre de sesión. */
function parsearEstadisticas(formData: FormData) {
  const eventoId = formData.get("eventoId");
  if (typeof eventoId !== "string" || !eventoId) {
    throw new ValidationError("Evento inválido.");
  }
  const jugadorIds = formData.getAll("jugadores").map(String);
  const registros = jugadorIds.map((jugadorId) => {
    const parsed = estadisticaSchema.safeParse({
      titular: formData.get(`titular_${jugadorId}`) === "on",
      goles: formData.get(`goles_${jugadorId}`) || 0,
      asistencias: formData.get(`asistencias_${jugadorId}`) || 0,
      amarillas: formData.get(`amarillas_${jugadorId}`) || 0,
      roja: formData.get(`roja_${jugadorId}`) === "on",
      azul: formData.get(`azul_${jugadorId}`) === "on",
    });
    if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
    return { jugadorId, ...parsed.data };
  });
  return { eventoId, registros };
}

// Estadística individual: se llama IMPERATIVAMENTE desde el cliente (la tabla
// del detalle del evento y CierreSesion), así que devuelve ActionResult para
// mostrar el error puntual inline sin que el formulario se reinicie.
export async function guardarEstadisticasAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const { eventoId, registros } = parsearEstadisticas(formData);
    await cargarEstadisticasDt(ctx, eventoId, registros);
    revalidatePath(`/dt/eventos/${eventoId}`);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function editarEventoAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = editarEventoSchema.safeParse({
      eventoId: formData.get("eventoId"),
      titulo: formData.get("titulo"),
      canchaId: formData.get("canchaId") || undefined,
      rival: formData.get("rival") || undefined,
      esLocal: formData.get("esLocal") === "on" ? true : formData.get("esLocal"),
      inicio: formData.get("inicio"),
      fin: formData.get("fin"),
      notas: formData.get("notas") || undefined,
    });
    if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
    await editarEventoDt(ctx, parsed.data.eventoId, parsed.data);
    revalidatePath(`/dt/eventos/${parsed.data.eventoId}`);
    revalidatePath("/dt/calendario");
    // El home "Hoy" lista los eventos del dia: tambien se invalida.
    revalidatePath("/dt");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function cancelarEventoAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const eventoId = formData.get("eventoId");
    if (typeof eventoId !== "string" || !eventoId) {
      throw new ValidationError("Evento inválido.");
    }
    await cancelarEventoDt(ctx, eventoId);
    revalidatePath(`/dt/eventos/${eventoId}`);
    revalidatePath("/dt/calendario");
    // El home "Hoy" lista los eventos del dia: tambien se invalida.
    revalidatePath("/dt");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
