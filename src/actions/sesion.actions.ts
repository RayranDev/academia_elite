"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/auth/session";
import { mapError, type ActionResult } from "@/lib/action-result";
import { textoSeguro } from "@/lib/validators/sanitizar";
import * as sesion from "@/services/sesion.service";

/**
 * Modo Sesión (PLAN-UX-DT PR-3 §3.1). A diferencia del resto del repo, estas
 * actions reciben un OBJETO TIPADO en vez de FormData: se invocan desde
 * componentes cliente con `startTransition`, no desde un <form>.
 */

const idsSchema = z.object({
  eventoId: z.string().min(1),
  jugadorId: z.string().min(1),
});

const marcarSchema = idsSchema.extend({
  estado: z.enum(["PRESENTE", "AUSENTE", "JUSTIFICADO"]),
  llegoTarde: z.boolean().optional(),
  salioAntes: z.boolean().optional(),
});

export async function marcarAsistenciaAction(
  input: z.infer<typeof marcarSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const datos = marcarSchema.parse(input);
    await sesion.marcarAsistenciaUnitaria(ctx, datos);
    revalidatePath(`/dt/eventos/${datos.eventoId}`);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function iniciarSesionAction(
  input: { eventoId: string },
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const { eventoId } = z.object({ eventoId: z.string().min(1) }).parse(input);
    await sesion.iniciarSesion(ctx, eventoId);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

const cerrarSchema = z.object({
  eventoId: z.string().min(1),
  notaSesion: textoSeguro({ max: 1000 }).optional(),
});

export async function cerrarSesionAction(
  input: z.infer<typeof cerrarSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const datos = cerrarSchema.parse(input);
    await sesion.cerrarSesion(ctx, datos);
    revalidatePath(`/dt/eventos/${datos.eventoId}`);
    revalidatePath("/dt");
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

export async function agregarConvocadoAction(
  input: z.infer<typeof idsSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const datos = idsSchema.parse(input);
    await sesion.agregarConvocadoEnCancha(ctx, datos);
    revalidatePath(`/dt/eventos/${datos.eventoId}`);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

const observacionSchema = z.object({
  jugadorId: z.string().min(1),
  eventoId: z.string().min(1).optional(),
  texto: textoSeguro({ min: 1, max: 500, error: "Escribí la observación." }),
  visiblePadre: z.boolean(),
});

export async function crearObservacionAction(
  input: z.infer<typeof observacionSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const datos = observacionSchema.parse(input);
    await sesion.crearObservacion(ctx, datos);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}

const golSchema = z.object({
  eventoId: z.string().min(1),
  anotadorId: z.string().min(1).optional(),
  asistenteId: z.string().min(1).optional(),
  esRival: z.boolean(),
  delta: z.union([z.literal(1), z.literal(-1)]),
});

export async function registrarGolAction(
  input: z.infer<typeof golSchema>,
): Promise<ActionResult<{ local: number; visitante: number }>> {
  try {
    const ctx = await requireAuthContext();
    const datos = golSchema.parse(input);
    const marcador = await sesion.registrarGolVivo(ctx, datos);
    revalidatePath(`/dt/eventos/${datos.eventoId}`);
    return { ok: true, data: marcador };
  } catch (e) {
    return mapError(e);
  }
}

const tarjetaSchema = idsSchema.extend({
  tipo: z.enum(["AMARILLA", "ROJA"]),
});

export async function marcarTarjetaAction(
  input: z.infer<typeof tarjetaSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuthContext();
    const datos = tarjetaSchema.parse(input);
    await sesion.marcarTarjeta(ctx, datos);
    revalidatePath(`/dt/eventos/${datos.eventoId}`);
    return { ok: true };
  } catch (e) {
    return mapError(e);
  }
}
