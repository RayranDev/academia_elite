"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { jugadorSchema } from "@/lib/validators/jugador";
import { evaluacionSchema } from "@/lib/validators/evaluacion";
import {
  crearJugadorDt,
  aprobarSolicitud,
  rechazarSolicitud,
} from "@/services/jugador.service";
import { crearEvaluacion } from "@/services/evaluacion.service";
import type { ResultadoStats } from "@/lib/stats-engine";

function primerError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Datos inválidos.";
}

export async function crearJugadorAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const parsed = jugadorSchema.safeParse({
      nombre: formData.get("nombre"),
      apellido: formData.get("apellido"),
      fechaNacimiento: formData.get("fechaNacimiento"),
      posicion: formData.get("posicion"),
      categoriaId: formData.get("categoriaId"),
      dorsal: formData.get("dorsal") || undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(primerError(parsed.error.issues));
    }
    await crearJugadorDt(ctx, parsed.data);
    revalidatePath("/dt");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function aprobarSolicitudAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const id = formData.get("jugadorId");
  if (typeof id !== "string" || !id) throw new ValidationError("Solicitud inválida.");
  await aprobarSolicitud(ctx, id);
  revalidatePath("/dt/solicitudes");
  revalidatePath("/dt");
}

export async function rechazarSolicitudAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const id = formData.get("jugadorId");
  if (typeof id !== "string" || !id) throw new ValidationError("Solicitud inválida.");
  await rechazarSolicitud(ctx, id);
  revalidatePath("/dt/solicitudes");
}

export async function crearEvaluacionAction(
  _prev: ActionResult<ResultadoStats> | undefined,
  formData: FormData,
): Promise<ActionResult<ResultadoStats>> {
  try {
    const ctx = await requireAuthContext();
    const parsed = evaluacionSchema.safeParse(
      Object.fromEntries(formData.entries()),
    );
    if (!parsed.success) {
      throw new ValidationError(primerError(parsed.error.issues));
    }
    const resultado = await crearEvaluacion(ctx, parsed.data);
    revalidatePath(`/dt/jugadores/${parsed.data.jugadorId}`);
    revalidatePath("/dt");
    return { ok: true, data: resultado };
  } catch (e) {
    return mapError(e);
  }
}
