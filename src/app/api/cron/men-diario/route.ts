import { NextResponse } from "next/server";
import { recalcularMenDiario } from "@/services/curva.service";

/**
 * Cron diario: recalcula el bonus de MEN de la curva de desarrollo según la
 * asistencia reciente de cada jugador. Protegido por CRON_SECRET (Vercel Cron
 * envía `Authorization: Bearer ${CRON_SECRET}`). Idempotente.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }
  const resultado = await recalcularMenDiario();
  return NextResponse.json({ ok: true, ...resultado });
}
