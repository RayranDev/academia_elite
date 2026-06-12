import { requireAuthContext } from "@/lib/auth/session";
import { listarJugadoresGestion } from "@/services/gestion-jugadores.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { JugadoresGestion } from "@/components/gestion/JugadoresGestion";

export default async function JugadoresEscuelaPage() {
  const ctx = await requireAuthContext();
  const [jugadores, categorias] = await Promise.all([
    listarJugadoresGestion(ctx),
    listarCategoriasEscuela(ctx),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Jugadores</h1>
      <p className="text-sm text-muted">
        Edita datos, inactiva/reactiva, bloquea el acceso de la familia y
        resetea contraseñas. Todas las acciones quedan auditadas.
      </p>
      <JugadoresGestion
        jugadores={jugadores}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        esSuperAdmin={false}
      />
    </div>
  );
}
