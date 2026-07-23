import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerSesionDt } from "@/services/sesion.service";
import { DomainError } from "@/lib/errors";
import { ModoSesion } from "@/components/dt/sesion/ModoSesion";

export const metadata = { title: "Sesión — Academia Elite" };

/**
 * Modo Sesión full-screen (PLAN-UX-DT PR-3 §3.2). El guard de rol del layout de
 * /dt sigue aplicando; el servicio revalida que el evento sea de una categoría
 * del DT.
 */
export default async function SesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let sesion;
  try {
    sesion = await obtenerSesionDt(ctx, id);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return <ModoSesion sesion={sesion} />;
}
