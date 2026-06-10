import { NextResponse } from "next/server";
import { leadFormSchema } from "@/lib/validators/lead";
import { crearLead } from "@/services/lead.service";
import { rateLimit } from "@/lib/rate-limit";

// Respuesta genérica: nunca revelamos por qué se descartó (anti-bot/anti-enum).
const okResponse = () => NextResponse.json({ ok: true });

/** Verifica que la mutación viene del propio sitio (CSRF básico para route handlers). */
function mismoOrigen(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "same-site";
  // Fallback: comparar host de Origin con el host del request.
  const origin = req.headers.get("origin");
  if (!origin) return true; // peticiones sin Origin (algunos clientes) se permiten
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!mismoOrigen(req)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Rate limit: 3/hora por IP (Sección 6.6).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  const limit = rateLimit(`leads:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = leadFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { website, renderizadoEn, ...lead } = parsed.data;

  // Honeypot relleno -> bot. Respondemos OK sin crear nada.
  if (website) return okResponse();

  // Tiempo mínimo de llenado (< 2s = bot). Respondemos OK sin crear nada.
  if (renderizadoEn && Date.now() - renderizadoEn < 2000) {
    return okResponse();
  }

  await crearLead(lead);
  return okResponse();
}
