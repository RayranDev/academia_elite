import { requireAuthContext } from "@/lib/auth/session";
import {
  listarPlantillaDt,
  listarCategoriasDelDt,
} from "@/services/jugador.service";
import { CrearJugadorDialog } from "@/components/dt/CrearJugadorDialog";
import { ImportarEvaluacionesDialog } from "@/components/dt/ImportarEvaluacionesDialog";
import { PlantillaGrid } from "@/components/dt/PlantillaGrid";

/**
 * Plantilla del DT. Vivía en `/dt`, pero ese lugar pasó a ser el home "Hoy":
 * al abrir la app el DT necesita su evento del día, no la grilla (PR-2 · B1).
 */
export default async function DtPlantillaPage() {
  const ctx = await requireAuthContext();
  const [plantilla, categorias] = await Promise.all([
    listarPlantillaDt(ctx),
    listarCategoriasDelDt(ctx),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display italic uppercase">Plantilla</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/jugadores-export"
            className="inline-flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            Descargar jugadores
          </a>
          <ImportarEvaluacionesDialog />
          <CrearJugadorDialog categorias={categorias} />
        </div>
      </div>

      <PlantillaGrid jugadores={plantilla} categorias={categorias} />
    </div>
  );
}
