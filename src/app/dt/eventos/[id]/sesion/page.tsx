import { redirect } from "next/navigation";

/**
 * Placeholder del Modo Sesión (PLAN-UX-DT PR-3). El home "Hoy" ya apunta acá,
 * así que hasta que exista el modo full-screen redirigimos al detalle del evento
 * en vez de servir un 404 en el botón principal del DT. PR-3 reemplaza este
 * archivo por la ruta real.
 */
export default async function SesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dt/eventos/${id}`);
}
