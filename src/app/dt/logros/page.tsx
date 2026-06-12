import { requireAuthContext } from "@/lib/auth/session";
import { listarCatalogoDt } from "@/services/logro.service";
import { listarPlantillaDt } from "@/services/jugador.service";
import { LogrosDt } from "@/components/logros/LogrosDt";

export default async function LogrosDtPage() {
  const ctx = await requireAuthContext();
  const [logros, plantilla] = await Promise.all([
    listarCatalogoDt(ctx),
    listarPlantillaDt(ctx),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Logros</h1>
      <p className="text-sm text-muted">
        Otorga logros a tus jugadores, programa ventanas de disponibilidad para
        tu escuela y crea logros propios. Los BONUS se aplican en la siguiente
        evaluación.
      </p>
      <LogrosDt
        logros={logros}
        jugadores={plantilla.map((j) => ({
          id: j.id,
          nombre: j.nombre,
          apellido: j.apellido,
          posicion: j.posicion,
          categoriaNombre: j.categoriaNombre,
        }))}
      />
    </div>
  );
}
