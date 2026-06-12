import { requireAuthContext } from "@/lib/auth/session";
import { obtenerProgresoPlantillaDt } from "@/services/progreso.service";
import { listarCategoriasDelDt } from "@/services/jugador.service";
import { ProgresoMasivo } from "@/components/dt/ProgresoMasivo";

export default async function ProgresoDtPage() {
  const ctx = await requireAuthContext();
  const [plantilla, categorias] = await Promise.all([
    obtenerProgresoPlantillaDt(ctx),
    listarCategoriasDelDt(ctx),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-black italic uppercase">Progreso</h1>
        <p className="text-sm text-muted">
          Valida los hábitos de la semana de tus jugadores. Si el responsable ya
          validó la semana, queda marcada y no se duplica.
        </p>
      </div>
      <ProgresoMasivo
        semana={plantilla.semana}
        jugadores={plantilla.jugadores}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </div>
  );
}
