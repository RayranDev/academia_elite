import { requireAuthContext } from "@/lib/auth/session";
import { listarJugadoresGestion } from "@/services/gestion-jugadores.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { JugadoresGestion } from "@/components/gestion/JugadoresGestion";
import { ImportarJugadoresDialog } from "@/components/gestion/ImportarJugadoresDialog";

export default async function JugadoresEscuelaPage() {
  const ctx = await requireAuthContext();
  const [jugadores, categorias] = await Promise.all([
    listarJugadoresGestion(ctx),
    listarCategoriasEscuela(ctx),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-display italic uppercase">Jugadores</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/jugadores-export"
            className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            Descargar jugadores
          </a>
          <ImportarJugadoresDialog />
        </div>
      </div>
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
