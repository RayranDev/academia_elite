"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { jugadorSchema } from "@/lib/validators/jugador";
import { evaluacionSchema } from "@/lib/validators/evaluacion";
import { objetivoSchema } from "@/lib/validators/objetivo";
import { crearObjetivoDt } from "@/services/objetivo.service";
import {
  crearJugadorDt,
  aprobarSolicitud,
  rechazarSolicitud,
} from "@/services/jugador.service";
import { crearEvaluacion } from "@/services/evaluacion.service";
import {
  importarEvaluaciones,
  type ResultadoImportEval,
} from "@/services/importacion-evaluaciones.service";
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

export async function crearObjetivoAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const parsed = objetivoSchema.safeParse({
    jugadorId: formData.get("jugadorId"),
    stat: formData.get("stat"),
    valorMeta: formData.get("valorMeta"),
    fechaLimite: formData.get("fechaLimite"),
  });
  if (!parsed.success) throw new ValidationError(primerError(parsed.error.issues));
  await crearObjetivoDt(ctx, parsed.data);
  revalidatePath(`/dt/jugadores/${parsed.data.jugadorId}`);
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

const MAX_XLSX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function importarEvaluacionesAction(
  _prev: ActionResult<ResultadoImportEval> | undefined,
  formData: FormData,
): Promise<ActionResult<ResultadoImportEval>> {
  try {
    const ctx = await requireAuthContext();
    const limite = rateLimit(`import-eval:${ctx.userId}`, 5, 60 * 60 * 1000);
    if (!limite.ok) throw new ValidationError("Demasiadas cargas. Espera un momento.");

    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      throw new ValidationError("Adjunta un archivo Excel (.xlsx).");
    }
    if (archivo.size > MAX_XLSX_BYTES) {
      throw new ValidationError("El archivo supera 5 MB.");
    }
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const data = await importarEvaluaciones(ctx, buffer);
    revalidatePath("/dt");
    return { ok: true, data };
  } catch (e) {
    return mapError(e);
  }
}
