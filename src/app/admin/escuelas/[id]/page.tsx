import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { obtenerEscuelaAdmin } from "@/services/escuela.service";
import { listarJugadoresGestion } from "@/services/gestion-jugadores.service";
import { listarCategoriasAdmin } from "@/services/categoria.service";
import { EscuelaEditarForm } from "@/components/gestion/EscuelaEditarForm";
import { JugadoresGestion } from "@/components/gestion/JugadoresGestion";

export default async function EscuelaDetalleAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let datos;
  try {
    const [escuela, jugadores, categorias] = await Promise.all([
      obtenerEscuelaAdmin(ctx, id),
      listarJugadoresGestion(ctx, { escuelaId: id }),
      listarCategoriasAdmin(ctx, id),
    ]);
    datos = { escuela, jugadores, categorias };
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">{datos.escuela.nombre}</h1>
      <EscuelaEditarForm escuela={datos.escuela} />
      <h2 className="pt-2 text-xl font-bold">Jugadores</h2>
      <JugadoresGestion
        jugadores={datos.jugadores}
        categorias={datos.categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        esSuperAdmin
      />
    </div>
  );
}
