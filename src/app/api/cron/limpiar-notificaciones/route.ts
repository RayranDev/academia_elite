import { NextResponse } from "next/server";
import { limpiarNotificacionesLeidas } from "@/services/notificacion.service";

/**
 * Cron diario: borra notificaciones ya leídas con más de 7 días, para que no
 * se acumulen sesión tras sesión. Protegido por CRON_SECRET (Vercel Cron envía
 * `Authorization: Bearer ${CRON_SECRET}`). Idempotente.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }
  const resultado = await limpiarNotificacionesLeidas();
  return NextResponse.json({ ok: true, ...resultado });
}
